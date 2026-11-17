import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
const ID=/^[A-Za-z0-9_-]{1,128}$/;
export function validateMarkEntry(input){
 if(!input||typeof input!=='object')throw new TypeError('Mark entry required');
 const {studentId,subjectId}=input,schoolClass=input.class,term=validateExamTerm(input.term);
 if(typeof studentId!=='string'||!ID.test(studentId))throw new Error('Invalid student ID');
 if(typeof subjectId!=='string'||!ID.test(subjectId))throw new Error('Invalid subject ID');
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 const theory=Number(input.theory),practical=Number(input.practical);
 if(input.theory===''||input.practical===''||input.theory==null||input.practical==null||!Number.isFinite(theory)||!Number.isFinite(practical)||theory<0||practical<0||theory>100||practical>100)throw new Error('Marks must be finite numbers between 0 and 100');
 return {studentId,subjectId,class:schoolClass,term,theory,practical};
}
export function markEntryId(entry){const e=validateMarkEntry(entry);return e.term+':'+e.studentId+':'+e.subjectId;}
// Backward-compatible entry point. Never upsert or bypass roster/assignment validation.
export async function saveSchoolMark(args){
 const {createSchoolMarkOnly}=await import('./mark-create-service.mjs');
 return createSchoolMarkOnly(args);
}
