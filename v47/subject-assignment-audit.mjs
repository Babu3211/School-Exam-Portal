import {validSchoolClass} from './class-catalog.mjs';
// Checks explicitly supplied student/subject relationships. No implied optional subjects.
export function auditSubjectAssignments({schoolClass,students,subjects,assignments}){
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 if(!Array.isArray(students)||!Array.isArray(subjects)||!assignments||typeof assignments!=='object'||Array.isArray(assignments))throw new TypeError('Student roster, subject catalog and assignment map required');
 const issues=[],studentIds=new Set(),subjectIds=new Set();
 for(const student of students){if(typeof student?.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(student.id)||student.class!==schoolClass||studentIds.has(student.id))issues.push('invalid_student');else studentIds.add(student.id)}
 for(const subject of subjects){if(typeof subject?.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(subject.id)||subjectIds.has(subject.id))issues.push('invalid_subject');else subjectIds.add(subject.id)}
 const pairs=new Set();
 for(const studentId of studentIds){const chosen=Object.hasOwn(assignments,studentId)?assignments[studentId]:null;
  if(!Array.isArray(chosen)||chosen.length===0){issues.push('missing_student_assignment');continue}
  for(const subjectId of chosen){if(typeof subjectId!=='string'||!subjectIds.has(subjectId)){issues.push('unknown_assigned_subject');continue}
   const key=JSON.stringify([studentId,subjectId]);if(pairs.has(key))issues.push('duplicate_assignment');else pairs.add(key)}
 }
 for(const studentId of Object.keys(assignments))if(!studentIds.has(studentId))issues.push('unknown_assigned_student');
 return {valid:issues.length===0,issues:[...new Set(issues)],expectedPairs:pairs.size};
}
