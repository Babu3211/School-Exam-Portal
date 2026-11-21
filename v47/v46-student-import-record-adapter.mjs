// Converts reviewed V46/IEMIS Excel columns into V47 student fields.
// Pure conversion only: never writes or overwrites Firestore records.
import {normalizeV46StudentClass} from './v46-iemis-student-import-preview.mjs';
import {isVerifiedStudentTransactionPlan} from './student-import-transaction-plan.mjs';
const text=(row,key)=>String(row[key]??'').normalize('NFC').trim();
const classes=new Set(['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]);
export function adaptVerifiedV46StudentImport(plan){
 if(!isVerifiedStudentTransactionPlan(plan)||plan.createOnly!==true||plan.transactionRequired!==true)
  throw new TypeError('Verified create-only transaction plan required');
 return Object.freeze(plan.records.map(row=>{
  const name=text(row,'Student Name'),className=normalizeV46StudentClass(text(row,'Class'));
  if(!name||!classes.has(className))throw new Error('Invalid student name or class');
  if(text(row,'IEMIS Code')!==plan.schoolId||row.schoolId!==plan.schoolId)
   throw new Error('Cross-school student import rejected');
  const studentIemisId=text(row,'Student IEMIS Id'),admissionNo=text(row,'Admission Number');
  if(!studentIemisId&&!admissionNo)throw new Error('Student identity required');
  const record={schoolId:plan.schoolId,name,class:className};
  if(studentIemisId)record.studentIemisId=studentIemisId;
  if(admissionNo)record.admissionNo=admissionNo;
  const fields={'Student Name in Nepali':'studentNameNepali','Gender':'gender','Father Name':'fatherName','Mother Name':'motherName','Section':'section','Permanent Address':'permanentAddress','Temporary Address':'temporaryAddress','DOB':'dob','Date of Birth (A.D.)':'dobAD','Mother Tongue':'motherTongue','Disability Type':'disabilityType','Guardian Name':'guardianName','Guardian Contact Number':'phone','Symbol Number':'symbolNo','Birth Registration Number':'birthRegistrationNo','NEB Registration Number':'nebRegNo','Year':'sourceYear'};
  for(const [column,key] of Object.entries(fields)){const v=text(row,column);if(v)record[key]=v}
  return Object.freeze(record);
 }));
}
