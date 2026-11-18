import {validateMarkEntry} from './marks-service.mjs';
import {validateSchoolId} from './school-paths.mjs';

// All roster students must have a valid entry before the caller starts ANY writes.
// expectedStudentIds must come from the authoritative school/class roster, not UI rows.
export function validateCompleteClassMarks({schoolId,classId,term,subjectId,expectedStudentIds,entries}){
 validateSchoolId(schoolId);
 if(!Array.isArray(expectedStudentIds)||expectedStudentIds.length===0||expectedStudentIds.length>1500)throw new Error('Class roster required');
 if(!Array.isArray(entries)||entries.length>1500)throw new TypeError('Mark entries required');
 const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id);
 const expected=new Set();
 for(const id of expectedStudentIds){
  if(!validId(id)||expected.has(id))throw new Error('Invalid or duplicate roster student ID');
  expected.add(id);
 }
 const seen=new Set(),validated=[];
 for(const raw of entries){
  const entry=validateMarkEntry(raw);
  if(entry.class!==classId||entry.term!==term||entry.subjectId!==subjectId)throw new Error('Mixed class, term or subject');
  if(!expected.has(entry.studentId))throw new Error('Student not in selected class roster');
  if(seen.has(entry.studentId))throw new Error('Duplicate student mark entry');
  seen.add(entry.studentId);
  validated.push(entry);
 }
 const missing=[...expected].filter(id=>!seen.has(id));
 if(missing.length)throw new Error('Cannot save: '+missing.length+' students have no marks ('+missing.slice(0,5).join(', ')+(missing.length>5?', ...':'')+')');
 return {schoolId,classId,term,subjectId,entries:validated,count:validated.length};
}
