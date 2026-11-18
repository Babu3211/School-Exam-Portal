import {validateCompleteClassMarks} from './class-mark-completeness.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
const ID=/^[A-Za-z0-9_-]{1,128}$/;
// Read-only draft diagnostics for up to 1500 students; no Firestore writes.
export function inspectClassMarkDraft({schoolId,classId,term,subjectId,expectedStudentIds,entries}){
 validateSchoolId(schoolId);
 if(!validSchoolClass(classId))throw new Error('Invalid class');
 validateExamTerm(term);
 if(typeof subjectId!=='string'||!ID.test(subjectId))throw new Error('Invalid subject');
 if(!Array.isArray(expectedStudentIds)||!expectedStudentIds.length||expectedStudentIds.length>1500)throw new Error('Class roster required');
 if(!Array.isArray(entries)||entries.length>1500)throw new Error('Draft marks required');
 const expected=new Set();
 for(const id of expectedStudentIds){
  if(typeof id!=='string'||!ID.test(id)||expected.has(id))throw new Error('Invalid or duplicate roster student ID');
  expected.add(id);
 }
 const seen=new Set(),invalid=[],foreign=[],duplicates=[],missing=[];
 for(const entry of entries){
  const id=entry?.studentId;
  if(typeof id!=='string'||!ID.test(id)){invalid.push(String(id));continue}
  if(!expected.has(id)){foreign.push(id);continue}
  if(seen.has(id)){duplicates.push(id);continue}
  seen.add(id);
  try{
   validateCompleteClassMarks({schoolId,classId,term,subjectId,expectedStudentIds:[id],entries:[entry]});
  }catch(error){invalid.push(id+': '+error.message)}
 }
 for(const id of expected)if(!seen.has(id))missing.push(id);
 const ready=missing.length===0&&invalid.length===0&&foreign.length===0&&duplicates.length===0;
 return {ready,expected:expected.size,entered:seen.size,missing,invalid,foreign,duplicates,
  summary:ready?'All '+expected.size+' students have valid draft marks; saving is not yet authorized':
  'Incomplete draft: '+missing.length+' missing, '+invalid.length+' invalid, '+foreign.length+' foreign, '+duplicates.length+' duplicate'};
}
