// Configured marks review: school-defined maxima, not IEMIS grading.
// No grade, GPA, official result, or writes. Inputs come from verified Draft reader.
import {validateConfiguredMarkComponents,primaryAchievementPair,inspectConfiguredClassMarks} from './configured-mark-preflight.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
export function prepareConfiguredMarksReview({schoolId,classNo,term,students,subjects,bySubject}){
 if(!/^\d{5,20}$/.test(schoolId)||!validSchoolClass(classNo)||!(bySubject instanceof Map)||!Array.isArray(students)||!students.length||students.length>1500||!Array.isArray(subjects)||!subjects.length||subjects.length>30)throw Error('Complete verified configured marks scope required');
 validateExamTerm(term);
 const ids=students.map(s=>s.id);
 if(new Set(ids).size!==ids.length||students.some(s=>s.schoolId!==schoolId||s.class!==classNo||s.active!==true)||new Set(subjects.map(s=>s.id)).size!==subjects.length||bySubject.size!==subjects.length)throw Error('Invalid configured marks identities');
 const index=new Map();
 for(const sub of subjects){
  if(sub.schoolId!==schoolId||sub.class!==classNo||sub.active!==true||typeof sub.name!=='string'||!sub.name.trim())throw Error('Foreign or inactive subject');
  const p=bySubject.get(sub.id);
  if(!p||!Array.isArray(p.entries))throw Error('Missing subject Draft');
  const settings={schoolId,classId:classNo,subjectId:sub.id,examId:term,active:true,components:p.components};
  const parts=validateConfiguredMarkComponents(settings,settings),pair=primaryAchievementPair(parts,classNo);
  const checked=inspectConfiguredClassMarks({...settings,settings,expectedStudentIds:ids,drafts:p.entries.map(r=>({studentId:r.studentId,isAbsent:r.isAbsent,values:r.isAbsent?undefined:r.values}))});
  if(!checked.complete)throw Error('Incomplete configured subject Draft');
  const verified=new Map(checked.ready.map(r=>[r.studentId,r]));
  for(const r of p.entries){
   const v=verified.get(r.studentId);
   if(!v||typeof r.totalObtained!=='number'||!Number.isFinite(r.totalObtained)||Math.abs(r.totalObtained-v.totalObtained)>1e-7||r.isAbsent===true&&r.values!==null)throw Error('Configured Draft total mismatch');
  }
  index.set(sub.id,{parts,pair,verified});
 }
 const baseHeaders=['Student ID','Student Name','Subject','Status','Obtained','Full Marks','Percentage'];
 const data=[];
 for(const st of students)for(const sub of subjects){
  const {parts,pair,verified}=index.get(sub.id),r=verified.get(st.id);
  const name=String(st.nameEnglish??st.name??st.id);
  const full=pair?(r.isAbsent?null:r.values[pair.countKey]*4):parts.reduce((n,c)=>n+c.fullMarks,0);
  const obtained=r.isAbsent?null:pair?r.values[pair.scoreKey]:r.totalObtained;
  const percent=obtained===null||full===null?null:Number((obtained/full*100).toFixed(2));
  const columns=parts.map(c=>r.isAbsent?c.name+' / '+c.fullMarks+' — Abs':c.name+' / '+c.fullMarks+' — '+r.values[c.key]);
  data.push({base:[st.id,name,sub.name,r.isAbsent?'Absent':'Recorded',obtained??'—',full??'—',percent??'—'],columns});
 }
 const tableFor=mode=>{
  if(!['number','entry'].includes(mode))throw Error('Configured preview supports marks only');
  const extra=mode==='entry'?Array.from({length:6},(_,i)=>'Component '+(i+1)+' (configured maximum / recorded value)'):[];
  return {headers:[...baseHeaders,...extra],rows:data.map(d=>[...d.base,...extra.map((_,i)=>d.columns[i]??'')])};
 };
 const excelFor=mode=>{const t=tableFor(mode);return excelWorkbook(['Notice','School ID','Class','Term',...t.headers],t.rows.map(r=>['PRIVATE DRAFT — NOT FOR OFFICIAL USE',schoolId,classNo,term,...r]),{sheetName:'Configured marks review'})};
 return Object.freeze({schoolId,classNo,term,rosterCount:students.length,subjectCount:subjects.length,configuredMarksPreview:true,previewOnly:true,publicationAllowed:false,writeAuthorized:false,tableFor,excelFor});
}
