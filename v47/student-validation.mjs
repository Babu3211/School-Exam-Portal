import {SCHOOL_CLASSES} from './class-catalog.mjs';
// Preserve V46 student details while keeping the V47 tenant schema strict.
// All optional fields are strings because Firestore rules require strings.
export const STUDENT_OPTIONAL_FIELDS=Object.freeze({
 rollNo:30,studentIemisId:128,admissionNo:128,studentNameNepali:500,
 gender:500,fatherName:500,motherName:500,section:500,
 permanentAddress:500,temporaryAddress:500,dob:500,dobAD:500,
 motherTongue:500,disabilityType:500,guardianName:500,phone:500,
 symbolNo:500,birthRegistrationNo:500,nebRegNo:500,sourceYear:500
});
export function validateStudent(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Student details required');
 const name=String(input.name??'').trim(),className=String(input.class??'').trim();
 if(name.length<2||name.length>160)throw new RangeError('Student name must be 2–160 characters');
 if(!SCHOOL_CLASSES.includes(className))throw new RangeError('Invalid class');
 const student={name,class:className};
 for(const [key,max] of Object.entries(STUDENT_OPTIONAL_FIELDS)){
  if(input[key]===undefined||input[key]===null||input[key]==='')continue;
  if(typeof input[key]!=='string'&&typeof input[key]!=='number')throw new TypeError('Invalid '+key);
  const value=String(input[key]).trim();
  if(value.length>max)throw new RangeError(key+' exceeds '+max+' characters');
  if(value)student[key]=value;
 }
 return student;
}
