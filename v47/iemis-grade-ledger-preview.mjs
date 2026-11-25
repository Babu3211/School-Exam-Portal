// Offline-only multi-subject IEMIS grade ledger preview. No persistence or approval.
import {previewIemisClassLedger} from './iemis-class-ledger-preview.mjs';
import {previewIemisGpa} from './iemis-gpa-preview.mjs';
export function previewIemisGradeLedger({classNo,term,students,subjects,draftsBySubject,academicYear,allowAbsent=false}){
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
  const ledger=previewIemisClassLedger({classNo,term,subject:item.name,students,drafts:draftsBySubject[id],allowAbsent});
  if(!ledger.complete)return {complete:false,subjectId:id,missing:ledger.missing,invalid:ledger.invalid,rows:[]};
  subjectLedgers.push({id,creditHour:credit,rows:ledger.rows});
 }
 if(Reflect.ownKeys(draftsBySubject).some(key=>typeof key!=='string'||!names.has(key)))throw Error('Unexpected subject drafts');
 const rows=students.map((student,index)=>{
  const subjectResults=subjectLedgers.map(ledger=>({subjectId:ledger.id,creditHour:ledger.creditHour,summary:ledger.rows[index].summary}));
  // Match V46 IEMIS 2083 first/second-term ledger GPA, including its
  // secondary credit weighting. Other callers retain conservative preview behavior.
  const termGpa=academicYear==='2083'&&Number(classNo)>=6&&Number(classNo)<=10&&['1st','2nd'].includes(term);
  const weighted=termGpa&&Number(classNo)>=9?subjectResults.map(s=>({...s,creditHour:s.creditHour*s.summary.inFull/100})):subjectResults;
  const gpa=previewIemisGpa(weighted,{annual:term==='final',primary:Number(classNo)<=5||termGpa});
  return {studentId:student.id,studentName:String(student.nameEnglish??student.name??''),subjects:subjectResults,gpa};
 });
 return {complete:true,total:rows.length,rows};
}
