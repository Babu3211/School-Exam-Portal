import {buildRawLedgerPreview} from './raw-ledger-preview.mjs';
// Diagnostic-only per-student raw mark matrix. No CDC grades or official results.
export function buildStudentMarkMatrix(input){
 const preview=buildRawLedgerPreview(input);
 const students=input.students.filter(s=>s&&typeof s.id==='string'&&s.id&&s.class===input.schoolClass);
 const subjects=new Map(input.subjects.filter(s=>s&&typeof s.id==='string'&&s.id&&s.class===input.schoolClass).map(s=>[s.id,s]));
 const rowsByPair=new Map();
 for(const row of preview.rows){
  const key=JSON.stringify([row.studentId,row.subjectId]);
  if(!rowsByPair.has(key))rowsByPair.set(key,[]);
  rowsByPair.get(key).push(row);
 }
 const assignments=new Map();
 for(const assignment of input.assignments){
  if(!assignment||assignment.class!==input.schoolClass||typeof assignment.studentId!=='string'||typeof assignment.subjectId!=='string')continue;
  if(!assignments.has(assignment.studentId))assignments.set(assignment.studentId,new Set());
  assignments.get(assignment.studentId).add(assignment.subjectId);
 }
 const matrix=students.map(student=>{
  const subjectIds=[...(assignments.get(student.id)??[])].sort((a,b)=>a.localeCompare(b));
  const subjectsForStudent=subjectIds.map(subjectId=>{
   const subject=subjects.get(subjectId),records=rowsByPair.get(JSON.stringify([student.id,subjectId]))??[];
   const expectedFormat=['9','10'].includes(input.schoolClass)&&subject?.name==='Computer'?'computer_4_36_10':'theory_practical';
   return Object.freeze({subjectId,subjectName:String(subject?.name??''),expectedFormat,recordCount:records.length,status:records.length===0?'missing':records.length>1?'duplicate':records[0].format===expectedFormat?'recorded':'wrong_format',records:Object.freeze([...records])});
  });
  return Object.freeze({studentId:student.id,studentName:String(student.name??''),assignedSubjects:subjectIds.length,recordedSubjects:subjectsForStudent.filter(s=>s.status==='recorded').length,subjects:Object.freeze(subjectsForStudent)});
 });
 matrix.sort((a,b)=>a.studentId.localeCompare(b.studentId));
 return Object.freeze({schoolClass:preview.schoolClass,term:preview.term,students:Object.freeze(matrix),issues:preview.issues,complete:preview.complete,gradeCalculated:false,publishable:false,officialLedger:false,iemisPolicyVerified:false});
}
