// V46 11-column Staff Excel import PREVIEW only. No teacher accounts,
// permissions, staff records, or Firebase writes are created here.
import {V46_STAFF_EXCEL_HEADERS} from './v46-staff-excel-schema.mjs';
import {validateSchoolId} from './school-paths.mjs';
export const MAX_STAFF_PREVIEW_ROWS=1500;
export function previewV46StaffExcelRows({schoolId,cells}){
 const id=validateSchoolId(schoolId);
 if(!Array.isArray(cells)||cells.length<1||cells.length>MAX_STAFF_PREVIEW_ROWS+1)
  throw new Error('Staff Excel must have a header and at most 1500 data rows');
 const headers=cells[0];
 if(!Array.isArray(headers)||headers.length!==V46_STAFF_EXCEL_HEADERS.length||
    !headers.every((text,index)=>text===V46_STAFF_EXCEL_HEADERS[index]))
  throw new Error('Excel columns must match the V46 Staff 11-column template exactly');
 const items=[],issues=[],warnings=[],seen=new Set();
 for(let n=1;n<cells.length;n++){
  const row=cells[n],line=n+1;
  if(!Array.isArray(row)||row.length!==11){
   issues.push({row:line,error:'Wrong staff column count'});continue;
  }
  if(row.every(v=>String(v??'').trim()===''))continue;
  if(row.some(v=>typeof v!=='string'&&typeof v!=='number')){
   issues.push({row:line,error:'Invalid Excel cell type'});continue;
  }
  const values=row.map(v=>String(v??'').trim());
  const [employeeId,nameNepali,nameEnglish]=values;
  if(values.some(value=>value.length>300)||employeeId.length>80){
   issues.push({row:line,error:'Staff cell exceeds allowed length'});continue;
  }
  if(!nameNepali&&!nameEnglish){
   issues.push({row:line,error:'Staff name is missing'});continue;
  }
  if(employeeId){
   if(seen.has(employeeId)){
    issues.push({row:line,error:'Duplicate Employee ID in uploaded Excel'});continue;
   }
   seen.add(employeeId);
  }else warnings.push({row:line,warning:'Employee ID is blank; match manually before import'});
  if(!nameEnglish)warnings.push({row:line,warning:'English name missing; verify before future import'});
  items.push(Object.freeze({row:line,employeeId,nameEnglish,nameNepali,position:values[4]}));
 }
 return Object.freeze({schoolId:id,format:'v46-staff-11-column',rows:Object.freeze(items),
  errors:Object.freeze(issues),warnings:Object.freeze(warnings),
  ready:issues.length===0,writeAuthorized:false,accountsCreated:false,databaseChanged:false,
  note:'Preview only: live existing-record duplicate checks, account creation and import save are not available.'});
}
