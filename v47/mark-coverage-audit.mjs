import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
// Diagnostics only: coverage is based on explicit student-subject assignments.
export function auditMarkCoverage({schoolClass,term,assignments,marks}){
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');validateExamTerm(term);
 if(!assignments||typeof assignments!=='object'||Array.isArray(assignments)||!Array.isArray(marks))throw new TypeError('Assignments and marks required');
 const expected=new Set(),observed=new Set(),issues=[];
 for(const [studentId,subjects] of Object.entries(assignments)){
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(studentId)||!Array.isArray(subjects)||subjects.length===0){issues.push('invalid_assignments');continue}
  for(const subjectId of subjects){if(typeof subjectId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(subjectId)){issues.push('invalid_assignments');continue}
   const key=JSON.stringify([studentId,subjectId]);if(expected.has(key))issues.push('duplicate_assignment');expected.add(key)}
 }
 for(const mark of marks){
  if(mark?.class!==schoolClass||mark?.term!==term){issues.push('wrong_class_or_term');continue}
  if(typeof mark.studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(mark.studentId)||typeof mark.subjectId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(mark.subjectId)){issues.push('invalid_mark_identity');continue}
  const key=JSON.stringify([mark.studentId,mark.subjectId]);if(observed.has(key))issues.push('duplicate_mark');observed.add(key);
  if(!expected.has(key))issues.push('unexpected_mark');
 }
 for(const key of expected)if(!observed.has(key))issues.push('missing_mark');
 return {complete:issues.length===0,expected:expected.size,observed:observed.size,issues:[...new Set(issues)]};
}
