import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
import {auditLoadedMarks} from './marks-audit.mjs';
// Fail-closed readiness check. Raw mark pages alone never authorize results publication.
export function assessResultReadiness({schoolClass,term,students,subjects,marks,allPagesLoaded=false,gradingPolicyVerified=false}){
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
 if(studentIds.size&&subjectIds.size&&seen.size!==studentIds.size*subjectIds.size)blockers.push('incomplete_student_subject_matrix');
 // Even complete raw marks are not sufficient without independently validated full marks, CDC grading and IEMIS parity.
 blockers.push('grade_engine_not_integrated');
 return {ready:false,blockers:[...new Set(blockers)],students:studentIds.size,subjects:subjectIds.size,marks:marks.length,checkedPairs:seen.size};
}
