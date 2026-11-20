// Offline-only multi-subject IEMIS grade ledger preview. No persistence or approval.
import {previewIemisClassLedger} from './iemis-class-ledger-preview.mjs';
import {previewIemisGpa} from './iemis-gpa-preview.mjs';
export function previewIemisGradeLedger({classNo,term,students,subjects,draftsBySubject}){
 if(!Array.isArray(subjects)||!subjects.length||subjects.length>30)throw Error('Subject roster required');
 if(!draftsBySubject||typeof draftsBySubject!=='object'||Array.isArray(draftsBySubject))throw Error('Subject drafts required');
 const names=new Set(),subjectLedgers=[];
 for(const item of subjects){
  const id=item?.id;
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(id)||names.has(id))throw Error('Invalid or duplicate subject ID');
  names.add(id);
  if(typeof item.name!=='string'||!item.name.trim()||item.name.length>150)throw Error('Subject name required');
  const credit=typeof item.creditHour==='number'?item.creditHour:NaN;
  if(!Number.isFinite(credit)||credit<=0||credit>20)throw Error('Positive subject credit required');
  const ledger=previewIemisClassLedger({classNo,term,subject:item.name,students,drafts:draftsBySubject[id]});
  if(!ledger.complete)return {complete:false,subjectId:id,missing:ledger.missing,invalid:ledger.invalid,rows:[]};
  subjectLedgers.push({id,creditHour:credit,rows:ledger.rows});
 }
 if(Reflect.ownKeys(draftsBySubject).some(key=>typeof key!=='string'||!names.has(key)))throw Error('Unexpected subject drafts');
 const rows=students.map((student,index)=>{
  const subjectResults=subjectLedgers.map(ledger=>({subjectId:ledger.id,creditHour:ledger.creditHour,summary:ledger.rows[index].summary}));
  const gpa=previewIemisGpa(subjectResults,{annual:term==='final',primary:Number(classNo)<=5});
  return {studentId:student.id,studentName:String(student.nameEnglish??student.name??''),subjects:subjectResults,gpa};
 });
 return {complete:true,total:rows.length,rows};
}
