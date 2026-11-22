import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validateSchoolSubject} from './subject-validation.mjs';
// Create-only; never silently replace a subject's definition.
export async function createSchoolSubject({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const subject=validateSchoolSubject(input);
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing transaction SDK');
 const ref=api.doc(db,'schools',schoolId,'subjects',subject.id);
 await api.runTransaction(db,async tx=>{const existing=await tx.get(ref);if(existing.exists())throw new Error('Subject already exists');tx.set(ref,{name:subject.name,class:subject.class,active:subject.active,theoryFullMarks:subject.theoryFullMarks,practicalFullMarks:subject.practicalFullMarks,schoolId})});
 return subject;
}
