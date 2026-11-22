import {verifyClassMarksCoverage} from './class-marks-coverage.mjs';
import {previewSchoolRawMarksWithV46} from './school-result-preview.mjs';
import {previewV46Gpa} from './v46-result-adapter.mjs';
// Diagnostic only: callers must fetch complete, school-scoped rosters and all mark pages.
// Never writes results or claims IEMIS certification.
export async function previewCompleteSchoolClass({students,subjects,records,hasMore=false,...context}){
 const {schoolClass,term}=context;
 const coverage=verifyClassMarksCoverage({students,subjects,records,schoolClass,term,hasMore});
 const rows=await previewSchoolRawMarksWithV46({...context,records});
 const credits=new Map();
 for(const subject of subjects){
  const credit=subject.creditHour;
  if(typeof credit!=='number'||!Number.isFinite(credit)||credit<=0||credit>100)throw new Error('Valid subject credit hours required');
  credits.set(subject.id,credit);
 }
 const byStudent=new Map(students.map(student=>[student.id,[]]));
 const subjectResults=new Map(students.map(student=>[student.id,[]]));
 for(const row of rows){
  if(!byStudent.has(row.studentId)||!credits.has(row.subjectId))throw new Error('Result outside verified roster');
  byStudent.get(row.studentId).push({summary:row.summary,creditHour:credits.get(row.subjectId)});
  subjectResults.get(row.studentId).push({subjectId:row.subjectId,summary:row.summary,creditHour:credits.get(row.subjectId)});
 }
 const results=[];
 for(const student of students){
  const entries=byStudent.get(student.id);
  if(entries.length!==subjects.length)throw new Error('Incomplete student result');
  const gpa=previewV46Gpa({subjects:entries,annual:true});
  const ordered=subjects.map(subject=>subjectResults.get(student.id).find(entry=>entry.subjectId===subject.id));
  if(ordered.some(entry=>!entry))throw new Error('Missing subject result in diagnostic ledger');
  results.push({studentId:student.id,gpa,complete:true,graded:gpa!==null,subjects:ordered});
 }
 return {coverage,results,diagnosticOnly:true};
}
