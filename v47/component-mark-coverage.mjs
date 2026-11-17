import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
import {auditComponentMarks} from './component-marks-audit.mjs';
// Diagnostic only: cannot publish results or infer CDC grades.
export function auditComputerComponentCoverage({schoolClass,term,students,subjects,assignments,rawMarks,componentMarks}){
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');validateExamTerm(term);
 if(![students,subjects,assignments,rawMarks,componentMarks].every(Array.isArray))throw new TypeError('All five record lists required');
 const issues=[],studentMap=new Map(),subjectMap=new Map(),assignmentKeys=new Set(),rawKeys=new Set(),componentKeys=new Set();
 for(const s of students){if(!s||typeof s.id!=='string'||studentMap.has(s.id)||s.class!==schoolClass)issues.push('invalid_student_roster');else studentMap.set(s.id,s)}
 for(const s of subjects){if(!s||typeof s.id!=='string'||subjectMap.has(s.id)||s.class!==schoolClass)issues.push('invalid_subject_roster');else subjectMap.set(s.id,s)}
 for(const a of assignments){const key=a?.studentId+':'+a?.subjectId;if(!a||a.class!==schoolClass||!studentMap.has(a.studentId)||!subjectMap.has(a.subjectId)||assignmentKeys.has(key))issues.push('invalid_assignment');else assignmentKeys.add(key)}
 for(const m of rawMarks){const key=m?.studentId+':'+m?.subjectId;if(!m||m.class!==schoolClass||m.term!==term||rawKeys.has(key))issues.push('invalid_raw_mark');else rawKeys.add(key)}
 const definitions={},computerSubjects=new Set();
 for(const s of subjects)if(s?.name==='Computer'&&s?.active===true&&['9','10'].includes(schoolClass)){computerSubjects.add(s.id);definitions[s.id]=[{key:'component_a',max:4},{key:'component_b',max:36},{key:'component_c',max:10}]}
 for(const m of componentMarks){const key=m?.studentId+':'+m?.subjectId;if(!m||!computerSubjects.has(m.subjectId)||!studentMap.has(m.studentId)||!assignmentKeys.has(key)||componentKeys.has(key))issues.push('invalid_component_record');else componentKeys.add(key)}
 if(componentMarks.length){const audit=auditComponentMarks({schoolClass,term,entries:componentMarks,componentsBySubject:definitions});for(const issue of audit.issues)issues.push(issue.code)}
 for(const key of componentKeys)if(rawKeys.has(key))issues.push('duplicate_raw_and_component_mark');
 for(const key of assignmentKeys){const subjectId=key.slice(key.indexOf(':')+1);if(computerSubjects.has(subjectId)&&!componentKeys.has(key))issues.push('missing_computer_components');if(computerSubjects.has(subjectId)&&rawKeys.has(key))issues.push('computer_recorded_as_two_field_mark')}
 return Object.freeze({checkedComponents:componentMarks.length,computerSubjects:computerSubjects.size,issueCount:issues.length,issues:Object.freeze(issues),gradeCalculated:false,publishable:false,iemisPolicyVerified:false});
}
