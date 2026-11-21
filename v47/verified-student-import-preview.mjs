// Read-only V47 import preview with authenticated school-scoped duplicate lookup.
// No Firebase writes. Host must provide a school-scoped Firestore reader.
import {verifyV46ImportPreflight} from './verified-v46-import-preflight.mjs';
import {previewV46IemisStudentImport} from './v46-iemis-student-import-preview.mjs';
const str=x=>{
 if(x===null||x===undefined)return '';
 if(typeof x==='object'||typeof x==='function'||typeof x==='symbol'||typeof x==='bigint')
  throw new TypeError('Invalid existing student identity type');
 if(typeof x==='number'&&(!Number.isFinite(x)||!Number.isSafeInteger(x)))
  throw new TypeError('Invalid existing student identity number');
 return String(x).normalize('NFC').trim();
};
const verifiedCloudPreviews=new WeakMap();
const PREVIEW_MAX_AGE_MS=5*60*1000;
export const verifiedPreviewOwner=value=>verifiedCloudPreviews.get(value)?.uid??null;
export const isVerifiedCloudPreview=(value,rows)=>{
 const issued=value&&typeof value==='object'?verifiedCloudPreviews.get(value):null;
 if(!issued||issued.rows!==rows)return false;
 let fingerprint;
 try{fingerprint=JSON.stringify(rows)}catch{return false}
 if(fingerprint!==issued.fingerprint)return false;
 const age=Date.now()-issued.verifiedAt;
 return age>=0&&age<=PREVIEW_MAX_AGE_MS;
};
export async function previewAgainstSchoolStudents({auth,schoolId,rows,readDocument,readStudents}={}){
 if(typeof readStudents!=='function')throw new TypeError('School-scoped student reader required');
 const context=await verifyV46ImportPreflight({auth,schoolId,collection:'students',readDocument});
 const uid=context.uid;
 const students=await readStudents({path:['schools',schoolId,'students'],schoolId,uid});
 if(auth?.currentUser?.uid!==uid)throw new Error('Authentication changed during student lookup');
 if(!Array.isArray(students))throw new TypeError('Complete student array required; do not pass a paginated result');
 const existingIemisIds=[],existingAdmissionNumbers=[];
 for(const student of students){
  if(!student||typeof student!=='object'||Array.isArray(student))throw new TypeError('Invalid existing student');
  if(student.schoolId!==undefined&&str(student.schoolId)!==schoolId)throw new Error('Cross-school student record in lookup');
  for(const id of new Set([student.studentIemisId,student.studentIEMISId,student.iemisId,student.studentIemisNo,student.iemisStudentNo].map(str).filter(Boolean)))existingIemisIds.push(id);
  for(const admission of new Set([student.admissionNumber,student.admissionNo].map(str).filter(Boolean)))existingAdmissionNumbers.push(admission);
 }
 if(auth?.currentUser?.uid!==uid)throw new Error('Authentication changed during duplicate verification');
 const preview=previewV46IemisStudentImport({rows,schoolId,existingIemisIds,existingAdmissionNumbers});
 if(auth?.currentUser?.uid!==uid)throw new Error('Authentication changed during Excel validation');
 const result=Object.freeze({preview,cloudChecked:true,schoolId,existingCount:students.length});
 const fingerprint=JSON.stringify(rows);
 if(auth?.currentUser?.uid!==uid)throw new Error('Authentication changed during preview fingerprinting');
 verifiedCloudPreviews.set(result,{rows,uid,fingerprint,verifiedAt:Date.now()});
 return result;
}
