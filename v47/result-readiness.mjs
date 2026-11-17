import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
import {auditLoadedMarks} from './marks-audit.mjs';
// Fail-closed readiness check. Raw mark pages alone never authorize results publication.
export function assessResultReadiness({schoolClass,term,students,subjects,marks,allPagesLoaded=false,gradingPolicyVerified=false,requiredSubjectsByStudent=null}){
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 validateExamTerm(term);
 if(!Array.isArray(students)||!Array.isArray(subjects)||!Array.isArray(marks))throw new TypeError('Students, subjects and marks must be arrays');
 const blockers=[];
 if(!allPagesLoaded)blockers.push('pagination_incomplete');
 if(!gradingPolicyVerified)blockers.push('cdc_iemis_policy_unverified');
 if(students.length===0)blockers.push('no_students');
 if(subjects.length===0)blockers.push('no_subjects');
 const studentIds=new Set(),subjectIds=new Set();
 for(const student of students){if(!student||typeof student.id!=='string'||!student.id||student.class!==schoolClass||studentIds.has(student.id))blockers.push('invalid_student_roster');else studentIds.add(student.id)}
 for(const subject of subjects){if(!subject||typeof subject.id!=='string'||!subject.id||subjectIds.has(subject.id))blockers.push('invalid_subject_roster');else subjectIds.add(subject.id)}
 const audit=auditLoadedMarks(marks,{schoolClass,term});
 if(audit.issueCount)blockers.push('invalid_mark_records');
 const seen=new Set();
 for(const mark of marks){if(!studentIds.has(mark?.studentId)||!subjectIds.has(mark?.subjectId))blockers.push('unknown_student_or_subject');else seen.add(JSON.stringify([mark.studentId,mark.subjectId]))}
 let expectedPairs=0;
 if(requiredSubjectsByStudent===null){
  // Optional subjects vary per student. A Cartesian product would invent required exams.
  blockers.push('student_subject_assignments_unverified');
 }else if(typeof requiredSubjectsByStudent!=='object'||Array.isArray(requiredSubjectsByStudent)){
  blockers.push('invalid_subject_assignments');
 }else{
  const assigned=new Set();
  for(const studentId of studentIds){
   const required=Object.hasOwn(requiredSubjectsByStudent,studentId)?requiredSubjectsByStudent[studentId]:null;
   if(!Array.isArray(required)||required.length===0){blockers.push('invalid_subject_assignments');continue}
   for(const subjectId of required){
    if(typeof subjectId!=='string'||!subjectIds.has(subjectId)){blockers.push('invalid_subject_assignments');continue}
    const pair=JSON.stringify([studentId,subjectId]);
    if(assigned.has(pair))blockers.push('invalid_subject_assignments');
    assigned.add(pair);
   }
  }
  for(const studentId of Object.keys(requiredSubjectsByStudent))if(!studentIds.has(studentId))blockers.push('invalid_subject_assignments');
  expectedPairs=assigned.size;
  for(const pair of assigned)if(!seen.has(pair))blockers.push('incomplete_student_subject_matrix');
  for(const pair of seen)if(!assigned.has(pair))blockers.push('unexpected_student_subject_mark');
 }
 // Never authorize publication without a verified CDC/IEMIS grade engine and subject-specific full marks.
 blockers.push('grade_engine_not_integrated');
 return {ready:false,blockers:[...new Set(blockers)],students:studentIds.size,subjects:subjectIds.size,marks:marks.length,checkedPairs:seen.size,expectedPairs};
}
