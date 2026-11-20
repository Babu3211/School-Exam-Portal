// Offline-only, class-scoped IEMIS ledger preview; never reads or writes Firestore.
import {inspectIemisClassDraft} from './iemis-class-draft-preview.mjs';
import {previewIemisEntryResult} from './iemis-entry-result-preview.mjs';
export function previewIemisClassLedger({classNo,term,subject,students,drafts}){
 const audit=inspectIemisClassDraft({classNo,term,subject,students,drafts});
 if(!audit.complete)return {complete:false,total:audit.total,missing:audit.missing,invalid:audit.invalid,rows:[]};
 const rows=students.map(student=>{
  const {record,summary}=previewIemisEntryResult(classNo,term,subject,drafts[student.id]);
  return {studentId:student.id,studentName:String(student.nameEnglish??student.name??''),record,summary};
 });
 return {complete:true,total:rows.length,missing:[],invalid:[],rows};
}
