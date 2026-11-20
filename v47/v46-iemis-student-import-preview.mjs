// V46-compatible IEMIS student import preview for V47. Pure validation only.
// Never writes or replaces existing students, marks, attendance or results.
import {assertIemisSchoolId} from './iemis-school-identity.mjs';
export const V46_IEMIS_HEADERS=Object.freeze(['S.N','IEMIS Code','School','Student IEMIS Id','Student Name','Student Name in Nepali','Gender','Father Name','Mother Name','Class','Section','Year','Permanent Address','Temporary Address','DOB','Is Transferred','Mother Tongue','Disability Type','Age','Guardian Name','Guardian Contact Number','Admission Number','Date of Birth (A.D.)','Symbol Number','Birth Registration Number','NEB Registration Number']);
const value=(r,k)=>String(r?.[k]??'').trim();
export function previewV46IemisStudentImport({rows,schoolId,existingIemisIds=[]}={}){
 assertIemisSchoolId(schoolId);
 if(!Array.isArray(rows))throw new TypeError('Excel rows array required');
 const existing=new Set(existingIemisIds.map(String));const seen=new Set();
 const records=rows.map((row,index)=>{
  const iemisCode=value(row,'IEMIS Code'),studentIemisId=value(row,'Student IEMIS Id');
  const errors=[];
  if(iemisCode!==schoolId)errors.push('School IEMIS mismatch');
  if(!studentIemisId)errors.push('Student IEMIS ID missing');
  if(!value(row,'Student Name'))errors.push('Student name missing');
  if(!value(row,'Class'))errors.push('Class missing');
  if(studentIemisId&&seen.has(studentIemisId))errors.push('Duplicate ID within Excel');
  if(studentIemisId&&existing.has(studentIemisId))errors.push('Student already exists');
  if(studentIemisId)seen.add(studentIemisId);
  return Object.freeze({row:index+2,studentIemisId,name:value(row,'Student Name'),class:value(row,'Class'),section:value(row,'Section'),gender:value(row,'Gender'),permanentAddress:value(row,'Permanent Address'),schoolId,errors:Object.freeze(errors),status:errors.length?'skip':'new'});
 });
 return Object.freeze({schoolId,total:records.length,ready:records.filter(x=>x.status==='new').length,skipped:records.filter(x=>x.status==='skip').length,records:Object.freeze(records)});
}
