import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
// Checks raw loaded records only. Never computes CDC grades, GPA, pass/fail or full marks.
export function auditLoadedMarks(records,{schoolClass,term}){
 if(!Array.isArray(records))throw new TypeError('Records must be an array');
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 validateExamTerm(term);
 const issues=[],seen=new Set();
 for(let index=0;index<records.length;index++){
  const r=records[index];const studentId=r?.studentId,subjectId=r?.subjectId;
  if(!r||typeof studentId!=='string'||typeof subjectId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(studentId)||!/^[A-Za-z0-9_-]{1,128}$/.test(subjectId)){issues.push({index,code:'missing_identity'});continue}
  const key=JSON.stringify([studentId,subjectId]);
  if(seen.has(key))issues.push({index,code:'duplicate_student_subject'});else seen.add(key);
  if(r.class!==schoolClass||r.term!==term)issues.push({index,code:'wrong_class_or_term'});
  for(const field of ['theory','practical'])if(typeof r[field]!=='number'||!Number.isFinite(r[field])||r[field]<0)issues.push({index,code:'invalid_'+field});
 }
 return {checked:records.length,issueCount:issues.length,issues,complete:false};
}
