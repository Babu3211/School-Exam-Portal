// V46-compatible IEMIS student import preview for V47. Pure validation only.
// Never writes or replaces existing students, marks, attendance or results.
import {assertIemisSchoolId} from './iemis-school-identity.mjs';
export const V46_IEMIS_HEADERS=Object.freeze(['S.N','IEMIS Code','School','Student IEMIS Id','Student Name','Student Name in Nepali','Gender','Father Name','Mother Name','Class','Section','Year','Permanent Address','Temporary Address','DOB','Is Transferred','Mother Tongue','Disability Type','Age','Guardian Name','Guardian Contact Number','Admission Number','Date of Birth (A.D.)','Symbol Number','Birth Registration Number','NEB Registration Number']);
const issuedPreviews=new WeakSet();
const supportedClasses=new Set(['ECD','NURSERY','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]);
export function normalizeV46StudentClass(value){
 const raw=String(value??'').trim().replace(/[०-९]/g,d=>String('०१२३४५६७८९'.indexOf(d))).toUpperCase();
 const alias=raw.replace(/^CLASS\s*|^कक्षा\s*/i,'').trim();
 return alias==='NURSERY'?'ECD':alias;
}
const value=(r,k)=>String(r?.[k]??'').trim();
export function normalizeV46IemisExcelRow(row){
 if(!row||typeof row!=='object'||Array.isArray(row))throw new TypeError('Excel row must be an object');
 return Object.freeze(Object.fromEntries(V46_IEMIS_HEADERS.map(header=>[header,value(row,header)])));
}
export function getReadyV46IemisRows(preview,{confirmed=false}={}){
 if(confirmed!==true)throw new Error('Admin confirmation required before import');
 if(!preview||!issuedPreviews.has(preview))throw new TypeError('Validated import preview required');
 return preview.records.filter(record=>record.status==='new').map(record=>({...record.excelData}));
}
export function previewV46IemisStudentImport({rows,schoolId,existingIemisIds=[],existingAdmissionNumbers=[]}={}){
 assertIemisSchoolId(schoolId);
 if(!Array.isArray(rows))throw new TypeError('Excel rows array required');
 const existing=new Set(existingIemisIds.map(x=>String(x).trim()).filter(Boolean));
 const existingAdmission=new Set(existingAdmissionNumbers.map(x=>String(x).trim()).filter(Boolean));
 const seen=new Set(),seenAdmission=new Set();
 const records=rows.map((row,index)=>{
  const excelData=normalizeV46IemisExcelRow(row);
  const iemisCode=excelData['IEMIS Code'],studentIemisId=excelData['Student IEMIS Id'];
  const admissionNo=excelData['Admission Number'];
  const className=normalizeV46StudentClass(excelData['Class']);
  const errors=[];
  if(iemisCode!==schoolId)errors.push('School IEMIS mismatch');
  if(!studentIemisId&&!admissionNo)errors.push('Student IEMIS ID or Admission Number required');
  if(!value(row,'Student Name'))errors.push('Student name missing');
  if(!className)errors.push('Class missing');
  else if(!supportedClasses.has(className))errors.push('Unsupported class');
  if(studentIemisId&&seen.has(studentIemisId))errors.push('Duplicate ID within Excel');
  if(studentIemisId&&existing.has(studentIemisId))errors.push('Student already exists');
  if(admissionNo&&seenAdmission.has(admissionNo))errors.push('Duplicate Admission Number within Excel');
  if(admissionNo&&existingAdmission.has(admissionNo))errors.push('Admission Number already exists');
  if(studentIemisId)seen.add(studentIemisId);
  if(admissionNo)seenAdmission.add(admissionNo);
  return Object.freeze({row:index+2,studentIemisId,admissionNo,name:value(row,'Student Name'),class:excelData['Class'],normalizedClass:className,section:value(row,'Section'),gender:value(row,'Gender'),permanentAddress:value(row,'Permanent Address'),schoolId,excelData,errors:Object.freeze(errors),status:errors.length?'skip':'new'});
 });
 const preview=Object.freeze({schoolId,total:records.length,ready:records.filter(x=>x.status==='new').length,skipped:records.filter(x=>x.status==='skip').length,records:Object.freeze(records)});
 issuedPreviews.add(preview);
 return preview;
}

// Class/section/search controls for the V47 Students Details preview UI.
// Filtered rows are read-only views of the original validated preview.
export function filterV46IemisStudentPreview(preview,{className='',section='',search='',status='all'}={}){
 if(!preview||!issuedPreviews.has(preview))throw new TypeError('Validated import preview required');
 if(!['all','new','skip'].includes(status))throw new Error('Invalid preview status filter');
 const selectedClass=String(className).trim().toLowerCase();
 const selectedSection=String(section).trim().toLowerCase();
 const query=String(search).trim().toLowerCase();
 return Object.freeze(preview.records.filter(record=>{
  if(selectedClass&&record.normalizedClass.toLowerCase()!==normalizeV46StudentClass(selectedClass).toLowerCase())return false;
  if(selectedSection&&record.section.toLowerCase()!==selectedSection)return false;
  if(status!=='all'&&record.status!==status)return false;
  if(query&&!([record.name,record.studentIemisId,record.excelData['Admission Number']].some(x=>x.toLowerCase().includes(query))))return false;
  return true;
 }));
}
