// Offline-only grade sheet projection. It is not an official printed certificate.
import {previewIemisGradeLedger} from './iemis-grade-ledger-preview.mjs';
export function previewIemisGradeSheet({studentId,...args}){
 if(typeof studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(studentId))throw Error('Valid student ID required');
 const ledger=previewIemisGradeLedger(args);
 if(!ledger.complete)return {ready:false,reason:'Class marks are incomplete',student:null};
 const row=ledger.rows.find(item=>item.studentId===studentId);
 if(!row)throw Error('Student not in selected class');
 if(row.gpa===null)return {ready:false,reason:'GPA cannot be calculated',student:null};
 return {ready:true,reason:null,student:{studentId:row.studentId,studentName:row.studentName,classNo:String(args.classNo),term:args.term,subjects:row.subjects,gpa:row.gpa}};
}
