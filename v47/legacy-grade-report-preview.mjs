// V47 read-only V46 IEMIS Grade Ledger/Sheet adapter.
// No fallback from raw theory/practical records, no Firestore write.
import {validateSchoolId} from './school-paths.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {renderAuthorizedV46ClassGradeLedger} from './iemis-authorized-class-ledger.mjs';
import {renderV46TenantLedger} from './iemis-v46-ledger-adapter.mjs';
import {iemisEntrySchema,iemisEntryDraft} from './iemis-entry.js';
import {iemisSubjectKey,iemisComponentKey,iemisSummary} from './iemis-ledger.js';
import {previewIemisGradeLedger} from './iemis-grade-ledger-preview.mjs';
import {renderIemisGradeSheetPrint} from './iemis-grade-sheet-print-preview.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
const termMap=Object.freeze({'1st':'first','2nd':'second','3rd':'third','final':'annual'});
export function prepareLegacyGradeReport({schoolId,school,classNo,term,students,subjects,records}){
 validateSchoolId(schoolId);
 if(!/^(?:[1-9]|10)$/.test(String(classNo))||!Object.hasOwn(termMap,term))throw Error('V46 IEMIS preview limited to Classes 1–10, 1st/2nd/3rd/Final');
 if(!school||typeof school.nameEnglish!=='string'||!school.nameEnglish.trim())throw Error('Verified school name required');
 if(!Array.isArray(students)||students.length<1||students.length>1500||!Array.isArray(subjects)||subjects.length<1||subjects.length>30||!Array.isArray(records)||records.length!==students.length*subjects.length)throw Error('Complete class and subject marks required');
 const ids=new Set(),subs=new Map(),draftsBySubject=Object.create(null),seen=new Set();
 for(const st of students){
  if(!st||st.schoolId!==schoolId||String(st.class)!==String(classNo)||!isActiveEnrolledStudent(st)||
    typeof st.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(st.id)||ids.has(st.id))throw Error('Foreign, inactive or duplicate student');
  ids.add(st.id);
 }
 for(const sub of subjects){
  const key=iemisSubjectKey(sub?.name);
  if(!sub||sub.schoolId!==schoolId||String(sub.class)!==String(classNo)||sub.active!==true||
    typeof sub.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(sub.id)||!key||subs.has(key)||
    typeof sub.name!=='string'||!sub.name.trim()||!Number.isFinite(sub.creditHour)||sub.creditHour<=0||sub.creditHour>20)throw Error('Foreign, inactive or duplicate subject');
  subs.set(key,sub);draftsBySubject[sub.id]=Object.create(null);
 }
 for(const mark of records){
  if(!mark||mark.schoolId!==schoolId||String(mark.class)!==String(classNo)||
     mark.term!==term||mark.examId!==term||!ids.has(mark.studentId))throw Error('Mark outside verified school/class/term');
  const sub=subs.get(iemisSubjectKey(mark.subject));
  if(!sub||(mark.subjectId!==undefined&&mark.subjectId!==sub.id))throw Error('Missing or foreign subject in marks');
  const pair=JSON.stringify([mark.studentId,sub.id]);
  if(seen.has(pair))throw Error('Duplicate class subject marks');
  seen.add(pair);
  if(!Array.isArray(mark.scores))throw Error('Raw marks cannot be silently converted to V46 IEMIS grades');
  const draft=iemisEntryDraft(mark,iemisEntrySchema(classNo,termMap[term],sub.name));
  if(draft.incompatible)throw Error('Incompatible V46 IEMIS assessment components');
  draftsBySubject[sub.id][mark.studentId]=draft;
 }
 if(seen.size!==students.length*subjects.length)throw Error('Incomplete class marks');
 const ledger=renderAuthorizedV46ClassGradeLedger({schoolId,schoolName:school.nameEnglish,schoolCode:schoolId,classNo,term,examId:term,students,subjects:subjects.map(s=>s.name),records});
 // All extra modes run only after the original complete-class, tenant, and
 // V46 component validation above. Nothing in these modes writes or publishes.
 const completeInput={schoolId,schoolName:school.nameEnglish,schoolCode:schoolId,classNo,
  term:termMap[term],academicYear:'2083',examId:term,students,
  subjects:subjects.map(s=>s.name),records,
  creditFor:name=>subs.get(iemisSubjectKey(name))?.creditHour??0,
  componentsFor:name=>iemisEntrySchema(classNo,termMap[term],name)};
 const ledgers=Object.freeze({grade:ledger,
  number:renderV46TenantLedger({...completeInput,term,mode:'number',academicYear:'2083'}),
  entry:renderV46TenantLedger({...completeInput,term,mode:'entry',academicYear:'2083'})});
 const recordIndex=new Map(records.map(r=>[JSON.stringify([r.studentId,iemisSubjectKey(r.subject)]),r]));
 const excelFor=mode=>{
  if(!['number','entry'].includes(mode))throw Error('Unsupported ledger Excel mode');
  const cols=subjects.flatMap(sub=>mode==='number'?[sub.name+' Obtained',sub.name+' Full']:
   [sub.name+' IsAbsent',...iemisEntrySchema(classNo,termMap[term],sub.name).map(c=>sub.name+' '+c.label)]);
  const headers=['PREVIEW ONLY — NOT FOR OFFICIAL USE','Class','Term','Student ID','Student Name',...cols];
  const rows=students.map(student=>{
   const values=subjects.flatMap(sub=>{
    const record=recordIndex.get(JSON.stringify([student.id,iemisSubjectKey(sub.name)]));
    if(!record)throw Error('Incomplete verified ledger Excel roster');
    if(mode==='number'){
     const summary=iemisSummary(record,{annual:term==='final',primary:Number(classNo)<=5});
     if(!summary.complete)throw Error('Incomplete number ledger cannot be exported');
     return [summary.obtained??'—',summary.full];
    }
    return [record.isAbsent?'Yes':'No',...iemisEntrySchema(classNo,termMap[term],sub.name).map(component=>{
     const score=record.scores.find(x=>iemisComponentKey(x.name)===component.key);
     if(!score)throw Error('Missing V46 IEMIS ledger component');
     return component.readonly?score.fullMarks:(score.obtained??'—');
    })];
   });
   return [schoolId,String(classNo),term,student.id,student.nameEnglish??student.name??'',...values];
  });
  return excelWorkbook(headers,rows,{sheetName:mode==='number'?'Unapproved Mark Ledger':'Unapproved Entry Ledger'});
 };
 const summary=previewIemisGradeLedger({classNo,term,students,subjects,draftsBySubject});
 if(!summary.complete)throw Error('Incomplete V46 grade preview');
 const printFor=studentId=>renderIemisGradeSheetPrint({school,classNo,term,students,subjects,draftsBySubject,studentId});
 return Object.freeze({schoolId,school,classNo:String(classNo),term,students,subjects,rosterCount:students.length,subjectCount:subjects.length,ledger,ledgers,excelFor,summary,printFor,previewOnly:true,writeAuthorized:false,publicationAllowed:false});
}
export function legacyGradePreviewExcel(result,mode='grade'){
 if(result?.previewOnly!==true||result.publicationAllowed!==false||result.writeAuthorized!==false||result.summary?.complete!==true)throw Error('Complete read-only grade preview required');
 if(!['grade','number','entry'].includes(mode))throw Error('Unapproved ledger mode required');
 if(mode!=='grade'){if(typeof result.excelFor!=='function')throw Error('Complete ledger export unavailable');return result.excelFor(mode)}
 const headers=['PREVIEW ONLY — NOT FOR OFFICIAL USE','Class','Term','Student ID','Student Name',...result.subjects.flatMap(s=>[s.name+' Grade',s.name+' Point']),'GPA (Unapproved)'];
 const rows=result.summary.rows.map(st=>[result.schoolId,result.classNo,result.term,st.studentId,st.studentName,...st.subjects.flatMap(x=>[x.summary?.totalGrade?.grade??'—',x.summary?.totalGrade?.point??'—']),Number.isFinite(st.gpa)?st.gpa:'—']);
 return excelWorkbook(headers,rows,{sheetName:'Unapproved Grade Ledger'});
}
