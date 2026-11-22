import {excelWorkbook} from './excel-workbook.mjs';
import {buildClassReviewCsv} from './class-review-csv.mjs';

// Validate the same complete read-only review used for JSON; emit real XLSX.
export function buildClassReviewExcel({json,studentNames={}}){
 // Existing strict validation also checks duplicate students, absent rows,
 // dynamic component limits and total obtained before any workbook is created.
 buildClassReviewCsv({json,studentNames});
 const review=JSON.parse(json);
 const columns=['Student ID','Student Name','Absent',...review.componentLimits.map(c=>c.name+' (max '+c.fullMarks+')'),'Total Obtained'];
 const rows=review.entries.map(row=>[
  row.studentId,Object.hasOwn(studentNames,row.studentId)?String(studentNames[row.studentId]):'',
  row.isAbsent?'Yes':'No',
  ...review.componentLimits.map(c=>row.isAbsent?'':row.values[c.key]),
  row.totalObtained
 ]);
 return excelWorkbook(columns,rows,{sheetName:'Class Marks Review'});
}
