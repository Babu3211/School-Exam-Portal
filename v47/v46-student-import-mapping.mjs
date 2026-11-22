import {STUDENT_EXCEL_HEADERS} from './v46-student-excel-schema.mjs';
import {validateStudent} from './student-validation.mjs';
import {validateSchoolId} from './school-paths.mjs';
// Pure V46 spreadsheet row mapping: no database writes or implicit school migration.
const columns=Object.freeze({
 'Student Name':'name','Student Name in Nepali':'studentNameNepali',
 'Student IEMIS Id':'studentIemisId','Gender':'gender',
 'Father Name':'fatherName','Mother Name':'motherName','Class':'class',
 'Section':'section','Year':'sourceYear','Permanent Address':'permanentAddress',
 'Temporary Address':'temporaryAddress','DOB':'dob','Mother Tongue':'motherTongue',
 'Disability Type':'disabilityType','Guardian Name':'guardianName',
 'Guardian Contact Number':'phone','Admission Number':'admissionNo',
 'Date of Birth (A.D.)':'dobAD','Symbol Number':'symbolNo',
 'Birth Registration Number':'birthRegistrationNo','NEB Registration Number':'nebRegNo'
});
export function mapV46StudentExcelRows({headers,rows,schoolId}){
 const sid=validateSchoolId(schoolId);
 if(!Array.isArray(headers)||headers.length!==STUDENT_EXCEL_HEADERS.length||
  headers.some((value,i)=>String(value??'').trim()!==STUDENT_EXCEL_HEADERS[i]))
  throw new Error('V46 student Excel columns do not match the official template');
 if(!Array.isArray(rows)||rows.length>1500)throw new RangeError('Maximum 1500 student rows per preview');
 const accepted=[],errors=[],seen=new Set(),seenAdmissions=new Set();
 for(let i=0;i<rows.length;i++){
  const row=rows[i];
  if(!Array.isArray(row)||row.length!==headers.length){errors.push({row:i+2,error:'Invalid column count'});continue}
  if(row.every(value=>String(value??'').trim()===''))continue;
  const sourceSchool=String(row[headers.indexOf('IEMIS Code')]??'').trim();
  if(sourceSchool&&sourceSchool!==sid){errors.push({row:i+2,error:'School IEMIS Code does not match selected school'});continue}
  try{
   const input={};
   for(const [header,key] of Object.entries(columns))input[key]=row[headers.indexOf(header)];
   const student=validateStudent(input);
   const iemis=student.studentIemisId;
   if(iemis&&seen.has(iemis))throw new Error('Duplicate Student IEMIS Id in spreadsheet');
   const admission=student.admissionNo;
   if(admission&&seenAdmissions.has(admission))throw new Error('Duplicate Admission Number in spreadsheet');
   if(iemis)seen.add(iemis);
   if(admission)seenAdmissions.add(admission);
   accepted.push({row:i+2,student});
  }catch(error){errors.push({row:i+2,error:String(error.message).slice(0,200)})}
 }
 return {schoolId:sid,accepted,errors,ready:errors.length===0};
}
