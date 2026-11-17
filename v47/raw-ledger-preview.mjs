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
 rows.sort((a,b)=>String(a.studentId??'').localeCompare(String(b.studentId??''))||String(a.subjectId??'').localeCompare(String(b.subjectId??''))||a.format.localeCompare(b.format));
 const assignedPairs=new Set(assignments.filter(a=>a&&a.class===schoolClass&&typeof a.studentId==='string'&&studentMap.get(a.studentId)?.class===schoolClass&&typeof a.subjectId==='string'&&subjectMap.get(a.subjectId)?.class===schoolClass&&subjectMap.get(a.subjectId)?.active===true).map(a=>JSON.stringify([a.studentId,a.subjectId])));
 const markedPairs=new Set(rows.filter(row=>row.class===schoolClass&&row.term===term&&studentMap.has(row.studentId)&&subjectMap.has(row.subjectId)&&assignedPairs.has(JSON.stringify([row.studentId,row.subjectId]))).map(row=>JSON.stringify([row.studentId,row.subjectId])));
 const missingPairs=[...assignedPairs].filter(pair=>!markedPairs.has(pair));
 const summary=Object.freeze({students:studentMap.size,subjects:subjectMap.size,assignedPairs:assignedPairs.size,markedPairs:markedPairs.size,missingPairs:missingPairs.length,rawRecords:rawMarks.length,computerComponentRecords:componentMarks.length});
 return Object.freeze({schoolClass,term,summary,rows:Object.freeze(rows.map(row=>Object.freeze(row))),issues:Object.freeze([...new Set([...audit.issues,...(!allPagesLoaded?['pagination_incomplete']:[])])]),complete:allPagesLoaded&&audit.issueCount===0,gradeCalculated:false,publishable:false,officialLedger:false,iemisPolicyVerified:false});
}
