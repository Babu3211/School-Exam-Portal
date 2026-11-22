// A bounded, read-only, authenticated export of ALL staff for ONE verified school.
// Does not silently produce a truncated roster or provision user accounts.
import {V46_STAFF_EXCEL_HEADERS,v46StaffExcelRow} from './v46-staff-excel-schema.mjs';
export const MAX_SCHOOL_STAFF_EXPORT=5000;
export async function collectCompleteSchoolStaffExport({store,assertSession,onProgress=()=>{},pageSize=100,maxRecords=MAX_SCHOOL_STAFF_EXPORT}={}){
 if(!store||typeof store.listPage!=='function'||typeof store.schoolId!=='string')throw new TypeError('School-scoped staff store required');
 if(typeof assertSession!=='function'||typeof onProgress!=='function')throw new TypeError('Export session and progress callbacks required');
 if(!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>100||!Number.isSafeInteger(maxRecords)||maxRecords<1||maxRecords>MAX_SCHOOL_STAFF_EXPORT)throw new RangeError('Unsafe staff export limit');
 const schoolId=store.schoolId,seen=new Set(),rows=[];
 let cursor=null,previousId=null,pages=0;
 do{
  assertSession();
  const page=await store.listPage('staff',{pageSize,cursor});
  assertSession();
  if(!page||!Array.isArray(page.records)||page.records.length>pageSize||typeof page.hasMore!=='boolean')
   throw new Error('Incomplete or malformed staff page');
  if(page.hasMore&&(!page.records.length||typeof page.cursor?.id!=='string'||!page.cursor.id))
   throw new Error('Missing pagination cursor');
  for(const item of page.records){
   if(!item||typeof item!=='object'||Array.isArray(item)||item.schoolId!==schoolId||
      typeof item.id!=='string'||!item.id||seen.has(item.id)||previousId!==null&&item.id<=previousId)
    throw new Error('Duplicate, out-of-order or cross-school staff record');
   previousId=item.id;seen.add(item.id);rows.push(v46StaffExcelRow(item));
   if(rows.length>maxRecords)throw new RangeError('Staff limit exceeded; no partial Excel file created');
  }
  pages++;
  if(pages>Math.ceil(maxRecords/pageSize)+1)throw new Error('Staff page limit exceeded');
  if(page.hasMore&&page.cursor.id!==previousId)throw new Error('Staff cursor does not match last record');
  assertSession();onProgress(rows.length);assertSession();
  cursor=page.hasMore?page.cursor:null;
 }while(cursor);
 assertSession();
 return Object.freeze({schoolId,count:rows.length,headers:V46_STAFF_EXCEL_HEADERS,rows:Object.freeze(rows),pages,complete:true});
}
