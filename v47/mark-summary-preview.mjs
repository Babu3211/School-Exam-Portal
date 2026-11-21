import {iemisSummary} from './iemis-ledger.js';
// Diagnostic summaries only. Exam/term and class context must be selected explicitly.
// Never interpret these as an official grade sheet or GPA.
export function previewV46MarkSummaries(rows,{classNo,annual=false,examId}={}){
 if(!rows||!Array.isArray(rows.marks)||!Array.isArray(rows.exams)||!Number.isInteger(classNo)||classNo<1||classNo>10||typeof annual!=='boolean'||typeof examId!=='string'||!examId)throw new Error('Verified class, term and exam selection required');
 if(!rows.exams.some(exam=>exam.id===examId))throw new Error('Exam is not in the verified school report snapshot');
 const selected=rows.marks.filter(mark=>mark.examId===examId&&Number(String(mark.className??'').match(/\d+/)?.[0])===classNo);
 const summaries=selected.map(mark=>{
  const summary=iemisSummary(mark,{annual,primary:classNo<=5});
  return Object.freeze({markId:mark.id,studentId:mark.studentId,subject:mark.subject,complete:summary.complete===true,grade:summary.totalGrade?.grade??null,obtained:summary.obtained??null,full:summary.full});
 });
 return Object.freeze({classNo,examId,annual,records:Object.freeze(summaries),completeCount:summaries.filter(x=>x.complete).length,publicationAllowed:false,official:false});
}
