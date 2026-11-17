import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
import {auditComputerComponentCoverage} from './component-mark-coverage.mjs';
// Read-only diagnostics; this is not a Mark Ledger, Grade Ledger or CDC/IEMIS result.
export function buildRawLedgerPreview({schoolClass,term,students,subjects,assignments,rawMarks,componentMarks,allPagesLoaded=false}){
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');validateExamTerm(term);
 if(![students,subjects,assignments,rawMarks,componentMarks].every(Array.isArray))throw new TypeError('All five record lists required');
 const audit=auditComputerComponentCoverage({schoolClass,term,students,subjects,assignments,rawMarks,componentMarks});
 const studentMap=new Map(students.filter(s=>s&&typeof s.id==='string').map(s=>[s.id,s])),subjectMap=new Map(subjects.filter(s=>s&&typeof s.id==='string').map(s=>[s.id,s]));
 const rows=[];
 for(const mark of rawMarks){if(!mark||typeof mark!=='object')continue;const subject=subjectMap.get(mark.subjectId),student=studentMap.get(mark.studentId);rows.push({studentId:mark.studentId,studentName:String(student?.name??''),subjectId:mark.subjectId,subjectName:String(subject?.name??''),class:mark.class,term:mark.term,format:'theory_practical',theory:mark.theory,practical:mark.practical,componentA:null,componentB:null,componentC:null})}
 for(const mark of componentMarks){if(!mark||typeof mark!=='object')continue;const subject=subjectMap.get(mark.subjectId),student=studentMap.get(mark.studentId);rows.push({studentId:mark.studentId,studentName:String(student?.name??''),subjectId:mark.subjectId,subjectName:String(subject?.name??''),class:mark.class,term:mark.term,format:'computer_4_36_10',theory:null,practical:null,componentA:mark.scores?.component_a??null,componentB:mark.scores?.component_b??null,componentC:mark.scores?.component_c??null})}
 rows.sort((a,b)=>a.studentId.localeCompare(b.studentId)||a.subjectId.localeCompare(b.subjectId)||a.format.localeCompare(b.format));
 return Object.freeze({schoolClass,term,rows:Object.freeze(rows.map(row=>Object.freeze(row))),issues:Object.freeze([...audit.issues,...(!allPagesLoaded?['pagination_incomplete']:[])]),complete:allPagesLoaded&&audit.issueCount===0,gradeCalculated:false,publishable:false,officialLedger:false,iemisPolicyVerified:false});
}
