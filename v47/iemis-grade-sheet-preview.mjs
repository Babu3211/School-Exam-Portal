// Offline-only grade sheet projection. It is not an official printed certificate.
import {previewIemisGradeLedger} from './iemis-grade-ledger-preview.mjs';
// Validate the whole class once, then use an indexed student result for each
// requested preview. Do not accept a caller-supplied summary as verified.
export function createIemisGradeSheetPreview(args){
 const ledger=previewIemisGradeLedger(args);
 const byId=new Map(ledger.rows.map(row=>[row.studentId,row]));
 return studentId=>{
  if(typeof studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(studentId))throw Error('Valid student ID required');
  if(!ledger.complete)return {ready:false,reason:'Class marks are incomplete',student:null};
  const row=byId.get(studentId);
  if(!row)throw Error('Student not in selected class');
  if(!Number.isFinite(row.gpa))return {ready:false,reason:'GPA cannot be calculated',student:null};
  return {ready:true,reason:null,student:{studentId:row.studentId,studentName:row.studentName,classNo:String(args.classNo),term:args.term,subjects:structuredClone(row.subjects),gpa:row.gpa}};
 };
}
export function previewIemisGradeSheet({studentId,...args}){
 if(typeof studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(studentId))throw Error('Valid student ID required');
 return createIemisGradeSheetPreview(args)(studentId);
}
