import {validateSchoolId} from './school-paths.mjs';
import {validateExamTerm} from './term-catalog.mjs';
import {canAccessSchool} from './permissions.mjs';
// Exam terms are the only supported exam identifiers; no duplicate exam-name field.
// Creation never overwrites an existing exam. Deletion remains disabled until
// backup, dependent-mark checks and audited server-side authorization exist.
export async function createSchoolExamTerm({db,api,actor,schoolId,term}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const id=validateExamTerm(term);
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firestore transaction methods');
 const ref=api.doc(db,'schools',schoolId,'exams',id);
 await api.runTransaction(db,async tx=>{
  const previous=await tx.get(ref);
  if(previous.exists())throw new Error('Exam term already exists');
  tx.set(ref,{schoolId,term:id});
 });
 return Object.freeze({id,schoolId,term:id});
}
export async function deleteSchoolExamTerm(){
 throw new Error('Exam deletion unavailable until backup, mark-dependency verification and audited server authorization are implemented');
}
