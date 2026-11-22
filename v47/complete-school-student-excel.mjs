// Read-only, tenant-scoped complete-school XLSX data collector.
// Does not trust an already loaded UI page, and never silently export a partial roster.
import {studentExcelRow} from './v46-student-excel-schema.mjs';
export const MAX_SCHOOL_STUDENT_EXPORT=5000;
export async function collectCompleteSchoolStudentExport({
 store,assertSession,onProgress=()=>{},pageSize=100,maxRecords=MAX_SCHOOL_STUDENT_EXPORT
}={}){
 if(!store||typeof store.listPage!=='function'||typeof store.schoolId!=='string')
  throw new TypeError('School-scoped student store required');
 if(typeof assertSession!=='function'||typeof onProgress!=='function')
  throw new TypeError('Export session and progress callbacks are required');
 if(!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>100)
  throw new RangeError('Invalid student page size');
 if(!Number.isSafeInteger(maxRecords)||maxRecords<1||maxRecords>MAX_SCHOOL_STUDENT_EXPORT)
  throw new RangeError('Maximum 5000 students per Excel export');
 const schoolId=store.schoolId;
 const rows=[],seen=new Set();let cursor=null,previousId=null,pages=0;
 do{
  assertSession();
  const page=await store.listPage('students',{pageSize,cursor});
  assertSession();
  if(!page||!Array.isArray(page.records)||page.records.length>pageSize||
     typeof page.hasMore!=='boolean')
   throw new Error('Invalid or incomplete school roster page');
  if(page.hasMore&&(!page.records.length||!page.cursor?.id||page.cursor.id===previousId))
   throw new Error('School roster pagination did not advance');
  for(const student of page.records){
   if(!student||typeof student!=='object'||Array.isArray(student)||
      student.schoolId!==schoolId||typeof student.id!=='string'||!student.id||
      seen.has(student.id))
    throw new Error('Duplicate, malformed, or cross-school student record');
   seen.add(student.id);
   rows.push(studentExcelRow(student));
   if(rows.length>maxRecords)throw new RangeError('More than 5000 students; export aborted without a partial Excel file');
  }
  pages++;
  if(pages>Math.ceil(maxRecords/pageSize)+1)
   throw new Error('School roster pagination exceeded the safe bound');
  assertSession();
  onProgress(rows.length);
  assertSession();
  if(page.hasMore){
   if(typeof page.cursor.id!=='string'||page.cursor.id<=String(previousId??''))
    throw new Error('School roster cursor order invalid');
   previousId=page.cursor.id;
   cursor=page.cursor;
  }else cursor=null;
 }while(cursor);
 assertSession();
 return Object.freeze({schoolId,count:rows.length,rows:Object.freeze(rows),pages,complete:true});
}
