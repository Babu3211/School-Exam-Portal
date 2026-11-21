// Read-only V47 import preview with authenticated school-scoped duplicate lookup.
// No Firebase writes. Host must provide a school-scoped Firestore reader.
import {verifyV46ImportPreflight} from './verified-v46-import-preflight.mjs';
import {previewV46IemisStudentImport} from './v46-iemis-student-import-preview.mjs';
const str=x=>String(x??'').trim();
const verifiedCloudPreviews=new WeakMap();
export const isVerifiedCloudPreview=(value,rows)=>!!value&&typeof value==='object'&&verifiedCloudPreviews.has(value)&&verifiedCloudPreviews.get(value)===rows;
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
  const id=str(student.studentIemisId??student.studentIEMISId??student.iemisId);
  const admission=str(student.admissionNumber??student.admissionNo);
  if(id)existingIemisIds.push(id);
  if(admission)existingAdmissionNumbers.push(admission);
 }
 const preview=previewV46IemisStudentImport({rows,schoolId,existingIemisIds,existingAdmissionNumbers});
 const result=Object.freeze({preview,cloudChecked:true,schoolId,existingCount:students.length});
 verifiedCloudPreviews.set(result,rows);
 return result;
}
