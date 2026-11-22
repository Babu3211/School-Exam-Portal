// School-scoped read-only Employee ID duplicate preflight for V46 Staff XLSX.
// All existing Staff pages must be loaded; never use an incomplete screen page.
import {collectCompleteSchoolStaffExport} from './complete-school-staff-excel.mjs';
export async function checkExistingStaffEmployeeIds({store,preview,assertSession,onProgress=()=>{}}){
 if(typeof assertSession!=='function'||typeof onProgress!=='function')throw new TypeError('Session checks required');
 if(!preview||preview.format!=='v46-staff-11-column'||!Array.isArray(preview.rows)||
    preview.writeAuthorized!==false||preview.databaseChanged!==false||preview.schoolId!==store?.schoolId)
  throw new Error('Verified matching-school Staff Excel preview required');
 assertSession();
 const existing=await collectCompleteSchoolStaffExport({store,assertSession,onProgress});
 assertSession();
 const used=new Set();
 for(const row of existing.rows){
  if(!Array.isArray(row)||row.length!==11)throw new Error('Malformed existing Staff record');
  const key=String(row[0]??'').trim().toUpperCase();
  if(!key)continue;
  if(used.has(key))throw new Error('Duplicate Employee IDs already exist in school; manual review required');
  used.add(key);
 }
 const duplicates=[];
 for(const item of preview.rows){
  assertSession();
  if(typeof item?.employeeId!=='string')throw new Error('Malformed uploaded Staff row');
  const key=item.employeeId.trim().toUpperCase();
  if(key&&used.has(key))duplicates.push(Object.freeze({row:item.row,employeeId:item.employeeId}));
 }
 assertSession();
 return Object.freeze({
  schoolId:preview.schoolId,scanned:existing.count,duplicates:Object.freeze(duplicates),
  ready:preview.ready===true&&duplicates.length===0,
  scannedAll:true,writeAuthorized:false,databaseChanged:false
 });
}
