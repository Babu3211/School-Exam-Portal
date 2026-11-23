// Verified Teacher Draft -> native XLSX; read-only and explicitly NOT a result.
// Caller must revalidate the School Admin session and source draft before download.
import {excelWorkbook} from './excel-workbook.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {completeClassDraftId} from './complete-class-draft-document.mjs';
export function teacherDraftReviewExcel(review){
 if(!review||review.found!==true||review.reviewOnly!==true||
    review.publicationAllowed!==false||review.officialMarksWritten!==false)
  throw Error('Verified read-only Teacher Draft Review required');
 validateSchoolId(review.schoolId);
 const docId=completeClassDraftId(review);
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(review.teacherUid)||!Number.isSafeInteger(review.revision)||review.revision<1||
    !Number.isSafeInteger(review.rosterCount)||review.rosterCount<1||review.rosterCount>1500||
    !Array.isArray(review.entries)||review.entries.length!==review.rosterCount||
    !Array.isArray(review.components)||!review.components.length||review.components.length>6)
  throw Error('Incomplete verified Teacher Draft Review');
 const seen=new Set();
 const headers=['School IEMIS ID','Class','Subject','Exam Term','Teacher UID',
  'Draft Revision','Student ID','Student Name','Absent',
  ...review.components.map(c=>String(c.name)+' / '+String(c.fullMarks)),
  'Total Obtained','Record Type'];
 const rows=review.entries.map(entry=>{
  if(!entry||typeof entry.studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(entry.studentId)||
     seen.has(entry.studentId)||typeof entry.studentName!=='string'||
     typeof entry.isAbsent!=='boolean')throw Error('Invalid or duplicate verified student');
  seen.add(entry.studentId);
  if(!entry.isAbsent&&(!entry.values||typeof entry.values!=='object'))throw Error('Missing verified component values');
  const values=review.components.map(c=>{
   if(typeof c.key!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(c.key)||
      !Number.isFinite(c.fullMarks)||c.fullMarks<=0)throw Error('Invalid verified component');
   if(entry.isAbsent)return '';
   const n=entry.values[c.key];
   if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>c.fullMarks)
    throw Error('Invalid verified obtained marks');
   return n;
  });
  if(typeof entry.totalObtained!=='number'||!Number.isFinite(entry.totalObtained)||
    (entry.isAbsent&&entry.totalObtained!==0)||
    (!entry.isAbsent&&Math.abs(values.reduce((a,b)=>a+b,0)-entry.totalObtained)>1e-7))
   throw Error('Verified total mismatch');
  return [review.schoolId,review.classId,review.subjectId,review.examId,review.teacherUid,
   review.revision,entry.studentId,entry.studentName,entry.isAbsent?'Yes':'No',
   ...values,entry.isAbsent?'':entry.totalObtained,'DRAFT ONLY — NOT OFFICIAL'];
 });
 const blob=excelWorkbook(headers,rows,{sheetName:'Teacher Draft Review'});
 const filename='smss-v47-TEACHER-DRAFT-NOT-OFFICIAL-'+review.schoolId+'-'+docId+'-r'+review.revision+'.xlsx';
 return Object.freeze({blob,filename,count:rows.length,revision:review.revision,
  official:false,publicationAllowed:false,format:'xlsx'});
}
