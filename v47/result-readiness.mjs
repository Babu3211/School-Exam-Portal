import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
import {auditLoadedMarks} from './marks-audit.mjs';
import {auditConfiguredFullMarks} from './full-marks-audit.mjs';
import {auditComponentMarks} from './component-marks-audit.mjs';
import {auditSubjectAssignments} from './subject-assignment-audit.mjs';
import {auditMarkCoverage} from './mark-coverage-audit.mjs';
import {auditSubjectCatalog} from './subject-catalog-audit.mjs';
// Fail-closed readiness check. Raw mark pages alone never authorize results publication.
export function assessResultReadiness({schoolClass,term,students,subjects,marks,allPagesLoaded=false,gradingPolicyVerified=false,requiredSubjectsByStudent=null,subjectLimits=null,componentEntries=null,componentsBySubject=null}){
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 validateExamTerm(term);
 if(!Array.isArray(students)||!Array.isArray(subjects)||!Array.isArray(marks))throw new TypeError('Students, subjects and marks must be arrays');
 const blockers=[];
 if(!allPagesLoaded)blockers.push('pagination_incomplete');
 if(!gradingPolicyVerified)blockers.push('cdc_iemis_policy_unverified');
 if(students.length===0)blockers.push('no_students');
 if(subjects.length===0)blockers.push('no_subjects');
 const catalogAudit=auditSubjectCatalog({schoolClass,subjects});if(!catalogAudit.valid)blockers.push('invalid_subject_catalog');
 const studentIds=new Set(),subjectIds=new Set();
 for(const student of students){if(!student||typeof student.id!=='string'||!student.id||student.class!==schoolClass||studentIds.has(student.id))blockers.push('invalid_student_roster');else studentIds.add(student.id)}
 for(const subject of subjects){if(!subject||typeof subject.id!=='string'||!subject.id||subjectIds.has(subject.id))blockers.push('invalid_subject_roster');else subjectIds.add(subject.id)}
 if(requiredSubjectsByStudent!==null){
  if(!requiredSubjectsByStudent||typeof requiredSubjectsByStudent!=='object'||Array.isArray(requiredSubjectsByStudent))blockers.push('invalid_subject_assignments');
  else {const assignmentAudit=auditSubjectAssignments({schoolClass,students,subjects,assignments:requiredSubjectsByStudent});if(!assignmentAudit.valid)blockers.push('invalid_subject_assignments');}
 }
 if(requiredSubjectsByStudent&&typeof requiredSubjectsByStudent==='object'&&!Array.isArray(requiredSubjectsByStudent)){
  const coverage=auditMarkCoverage({schoolClass,term,assignments:requiredSubjectsByStudent,marks});
  if(!coverage.complete)blockers.push('mark_coverage_incomplete_or_inconsistent');
 }
 const audit=auditLoadedMarks(marks,{schoolClass,term});
 if(audit.issueCount)blockers.push('invalid_mark_records');
 if(subjectLimits===null)blockers.push('subject_full_marks_unverified');
 else {const fullMarksAudit=auditConfiguredFullMarks({schoolClass,term,marks,subjectLimits});if(fullMarksAudit.issueCount)blockers.push('invalid_or_exceeded_subject_full_marks');}
 if(componentEntries!==null||componentsBySubject!==null){
  if(!Array.isArray(componentEntries)||!componentsBySubject||typeof componentsBySubject!=='object'||Array.isArray(componentsBySubject))blockers.push('component_configuration_unverified');
  else {const componentAudit=auditComponentMarks({schoolClass,term,entries:componentEntries,componentsBySubject});if(componentAudit.issueCount)blockers.push('invalid_component_marks');}
  // The current persisted marks schema only stores theory/practical; multi-component values are not integrated.
  blockers.push('component_marks_storage_not_integrated');
 }
 const seen=new Set(),componentPairs=new Set();
 if(Array.isArray(componentEntries))for(const entry of componentEntries){
  if(!studentIds.has(entry?.studentId)||!subjectIds.has(entry?.subjectId))blockers.push('unknown_component_student_or_subject');
  else componentPairs.add(JSON.stringify([entry.studentId,entry.subjectId]));
 }
 for(const mark of marks){if(!studentIds.has(mark?.studentId)||!subjectIds.has(mark?.subjectId))blockers.push('unknown_student_or_subject');else seen.add(JSON.stringify([mark.studentId,mark.subjectId]))}
 for(const pair of componentPairs)if(seen.has(pair))blockers.push('ambiguous_duplicate_mark_format');
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
