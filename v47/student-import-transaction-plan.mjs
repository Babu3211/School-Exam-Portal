// V47 read-only Firestore transaction planning contract.
// Never performs writes. Existing records and marks must remain untouched.
// A future writer must use a single transaction with authoritative school
// membership and duplicate checks, and create-only operations.
import {assertIemisSchoolId} from './iemis-school-identity.mjs';
import {isVerifiedStudentSavePlan} from './verified-student-import-save-gate.mjs';

const value=(record,key)=>String(record?.[key]??'').trim();
const issuedTransactionPlans=new WeakSet();
export const isVerifiedStudentTransactionPlan=value=>!!value&&typeof value==='object'&&issuedTransactionPlans.has(value);
export function planStudentImportTransaction({prepared,existingStudents}={}){
 if(!isVerifiedStudentSavePlan(prepared))throw new TypeError('Verified prepared import required');
 const schoolId=assertIemisSchoolId(prepared.schoolId);
 if(prepared.requiresTransactionalDuplicateRecheck!==true||!Array.isArray(prepared.records)||prepared.count!==prepared.records.length)
  throw new Error('Verified transaction-ready import required');
 if(prepared.records.length===0||prepared.records.length>400)throw new Error('Invalid reviewed import size');
 if(!Array.isArray(existingStudents))throw new TypeError('Complete fresh student list required');
 const ids=new Set(),admissions=new Set();
 for(const record of existingStudents){
  if(!record||typeof record!=='object'||Array.isArray(record))throw new TypeError('Invalid existing student');
  if(record.schoolId!==undefined&&record.schoolId!==schoolId)throw new Error('Cross-school student data rejected');
  const id=[record.studentIemisId,record.studentIEMISId,record.iemisId,record.studentIemisNo,record.iemisStudentNo].map(x=>String(x??'').trim()).find(Boolean)||'';
  const admission=String(record.admissionNumber??record.admissionNo??'').trim();
  if(id)ids.add(id);
  if(admission)admissions.add(admission);
 }
 const newIds=new Set(),newAdmissions=new Set();
 const records=prepared.records.map(record=>{
  if(!record||typeof record!=='object'||Array.isArray(record))throw new TypeError('Invalid import row');
  const code=value(record,'IEMIS Code'),id=value(record,'Student IEMIS Id'),admission=value(record,'Admission Number');
  if(code!==schoolId)throw new Error('Cross-school Excel row rejected');
  if(!id&&!admission)throw new Error('Student identity required');
  if(!value(record,'Student Name'))throw new Error('Student name required');
  if(id&&(ids.has(id)||newIds.has(id)))throw new Error('Duplicate Student IEMIS ID at transaction time');
  if(admission&&(admissions.has(admission)||newAdmissions.has(admission)))throw new Error('Duplicate Admission Number at transaction time');
  if(id)newIds.add(id);
  if(admission)newAdmissions.add(admission);
  return Object.freeze({...record,schoolId});
 });
 const plan=Object.freeze({schoolId,uid:prepared.uid,path:Object.freeze(['schools',schoolId,'students']),
  records:Object.freeze(records),count:records.length,createOnly:true,transactionRequired:true});
 issuedTransactionPlans.add(plan);
 return plan;
}
