import {excelWorkbook} from './excel-workbook.mjs';
import {validateConfiguredMarkComponents} from './configured-mark-preflight.mjs';

// Read-only Excel sample for the verified class roster and subject settings.
// No marks are written, and no CSV/JSON file is exposed to users.
export function buildClassMarksExcelSample({schoolId,classId,subjectId,examId,settings,students}){
 const components=validateConfiguredMarkComponents(settings,{schoolId,classId,subjectId,examId});
 if(!Array.isArray(students)||students.length<1||students.length>1500)throw new Error('Complete class roster required');
 const seen=new Set(),rows=[];
 for(const student of students){
  const id=student?.id;
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(id)||seen.has(id)||student.active!==true)throw new Error('Invalid or inactive student in class roster');
  seen.add(id);
  rows.push([id,String(student.name??id),'No',...components.map(()=>'')]);
 }
 const headers=['Student ID','Student Name','Absent (Yes/No)',...components.map(c=>c.name+' (max '+c.fullMarks+')')];
 return excelWorkbook(headers,rows,{sheetName:'Marks Entry Sample'});
}
