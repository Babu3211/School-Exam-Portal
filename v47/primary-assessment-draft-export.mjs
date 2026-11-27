// Exports read only saved, source-bound private teacher drafts, never unsaved UI values.
import {loadMathAssessmentDraft} from './primary-assessment-math-draft.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {draftThemeSlots} from './primary-assessment-teacher-worksheet.mjs';
import {scoreSeroferoDraft} from './primary-assessment-v46-serofero-text.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
import {assessmentPrintWordBlob} from './primary-assessment-portfolio.mjs';
export async function readSavedAssessmentDraftReport(args){
 const {model,studentId,themeIndex,assertCurrent}=args;
 const slots=draftThemeSlots(model,themeIndex),theme=model.themes[themeIndex],student=model.students.find(s=>s.id===studentId);
 if(!student||!slots.every(s=>s.sourceText))throw Error('Source or student unavailable');
 const binary=model.key==='serophero',staged=['1','2','3'].includes(model.grade)&&['nepali','english','serophero'].includes(model.key);
 const stages=staged?['regular','support']:[undefined];
 const saved=await Promise.all(stages.map(stage=>loadMathAssessmentDraft({...args,stage})));assertCurrent();
 const hasSaved=saved.some(Boolean);if(!hasSaved&&!args.includeBlank)throw Error('No saved assessment draft');
 const ne=['nepali','socialstudies','serophero','hamrodhunibeshi'].includes(model.key);
 const labels=staged?(ne?['नियमित','थप सहायतापछि']:['Regular','Remedial']):[ne?'मूल्याङ्कन':'Assessment'];
 const columns=binary?(ne?['मुख्य सिकाइ उपलब्धि','सूचक','साधन']:['Learning achievement','Indicator','Tool']):model.key==='english'&&staged?['Areas / Skills','Learning outcomes']:model.key==='nepali'&&staged?['सिकाइ उपलब्धि','परीक्षण गर्ने पक्ष','साधन']:[ne?'सिकाइ उपलब्धि':'Learning achievement'];
 const headers=[...columns,...labels.flatMap(label=>binary?[label+' — सकेको / नसकेको',label+' — मिति',label+' — अङ्कन / ४']:[label+(ne?' — मिति':' — Date (BS)'),label+(ne?' — अङ्कन / ४':' — Rating / 4')])];
 const date=(d,i)=>d?.rowDates?.slice(i*10,i*10+10)||d?.date||'';
 const rows=[];
 for(const [i,slot] of slots.entries()){
  const r=slot.sourceText;
  if(binary){
   for(let j=0;j<4;j++){
    const values=saved.flatMap(d=>{const v=d?.ratings[i*4+j],block=d?.ratings.slice(i*4,i*4+4),used=block&&/[01]/.test(block);const score=block?scoreSeroferoDraft(block).blocks[0]:null;return [v==='1'?'सकेको':v==='0'?'नसकेको':'',j===0&&used?date(d,i):'',j===0&&score!==null?score:'']});
    rows.push([r.title,r.indicators[j],r.tools[j]==='मूल फाराममा खाली'?'':r.tools[j],...values]);
   }
  }else{
   const title=[r.title,r.titleEn,r.achievement,...(r.criteria??[]).map((c,k)=>(4-k)+' — '+c.join(' / '))].filter(Boolean).join('\n');
   const lead=model.key==='english'&&staged?[r.aspect??'',title]:model.key==='nepali'&&staged?[title,r.aspect??'',r.tool??'']:[title];
   rows.push([...lead,...saved.flatMap(d=>{const v=d?.ratings[i];return v&&v!=='_'?[date(d,i),Number(v)]:['','']})]);
  }
 }
 assertCurrent();
 return Object.freeze({title:ne?'सुरक्षित मूल्याङ्कन Draft — '+theme.theme:'Saved Assessment Draft — '+theme.theme,schoolId:model.schoolId,studentId,studentName:student.name,grade:model.grade,section:student.section,year:'2083',historical:0,hasSaved,headers:Object.freeze(headers),rows:Object.freeze(rows.map(Object.freeze)),notice:ne?'निजी सुरक्षित Draft मात्र — आधिकारिक मूल्याङ्कन वा ग्रेड होइन।':'Private saved draft only — NOT official assessment or grade',officialAssessmentApproved:false});
}
export async function exportSavedAssessmentDraft(args,kind){
 if(!['word','excel'].includes(kind))throw Error('Invalid export kind');
 const model=await readSavedAssessmentDraftReport(args);
 const blob=kind==='word'?assessmentPrintWordBlob(model):excelWorkbook(['Status','School ID','Student ID','Class','Year','Subject','Theme',...model.headers],model.rows.map(r=>[model.notice,model.schoolId,model.studentId,model.grade,model.year,args.model.subjectName,args.model.themes[args.themeIndex].theme,...r]),{sheetName:'Saved draft'});
 args.assertCurrent();
 return {blob,filename:'V47-DRAFT-'+model.schoolId+'-'+model.studentId+'-'+args.model.subjectId+'-2083.'+(kind==='word'?'docx':'xlsx'),count:model.rows.length};
}

// Complete active class, one selected subject/theme, including explicit blank forms.
export async function readClassAssessmentDraftReports(args){
 const {model,actor,db,api,themeIndex,assertCurrent}=args;
 if(!['teacher','school_admin'].includes(actor?.role)||actor.schoolId!==model.schoolId)throw Error('Verified assessment scope required');
 const roster=await loadCompleteClassRoster({db,api,actor,schoolId:model.schoolId,classId:model.grade,activeOnly:true,assertCurrent});assertCurrent();
 const students=roster.students.map(s=>Object.freeze({id:s.id,name:String(s.nameEnglish??s.name??s.id),section:String(s.section??'')}));
 if(!students.length||students.length>1500||new Set(students.map(s=>s.id)).size!==students.length)throw Error('Invalid or oversized active class');
 const n=draftThemeSlots(model,themeIndex).length*(model.key==='serophero'?4:1);
 if(n*students.length>50000)throw Error('Class export exceeds 50000 rows; select a smaller class');
 const batchModel=Object.freeze({...model,students:Object.freeze(students)}),reports=[];
 for(let i=0;i<students.length;i+=8){assertCurrent();reports.push(...await Promise.all(students.slice(i,i+8).map(s=>readSavedAssessmentDraftReport({...args,model:batchModel,studentId:s.id,includeBlank:true}))));assertCurrent();}
 return Object.freeze({reports:Object.freeze(reports),studentCount:reports.length,savedCount:reports.filter(r=>r.hasSaved).length,officialAssessmentApproved:false});
}
export function exportClassAssessmentDraftReports(batch,model,themeIndex,kind){
 if(!['word','excel'].includes(kind)||!batch.reports.length)throw Error('Invalid class export');
 const first=batch.reports[0],headers=['Status','School ID','Class','Year','Subject','Theme','Student ID','Student','Section','Draft status',...first.headers];
 const rows=batch.reports.flatMap(r=>r.rows.map(row=>[r.notice,r.schoolId,r.grade,r.year,model.subjectName,model.themes[themeIndex].theme,r.studentId,r.studentName,r.section,r.hasSaved?'Saved':'Not saved',...row]));
 const blob=kind==='word'?assessmentPrintWordBlob(first,batch.reports):excelWorkbook(headers,rows,{sheetName:'Class saved drafts'});
 return {blob,filename:'V47-CLASS-DRAFT-'+model.schoolId+'-'+model.grade+'-'+model.subjectId+'-2083.'+(kind==='word'?'docx':'xlsx'),count:batch.studentCount};
}
