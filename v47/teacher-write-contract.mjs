// V47-only teacher write contract. Authorization MUST also be enforced by Firestore rules.
import {assertSchoolId} from './school-scope.mjs';
const safe=/^[A-Za-z0-9_-]{1,128}$/;
export function validateTeacherWrite({schoolId,studentId,className,subject,section='ALL',marks}){
 assertSchoolId(schoolId);
 if(typeof studentId!=='string'||!safe.test(studentId))throw new TypeError('Invalid student');
 for(const value of [className,subject,section])if(typeof value!=='string'||!value.trim()||value.length>160||value.includes('::'))throw new TypeError('Invalid assignment field');
 if(!marks||typeof marks!=='object'||Array.isArray(marks)||Object.keys(marks).length===0)throw new TypeError('Invalid marks');
 for(const [key,value] of Object.entries(marks)){if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key))throw new TypeError('Invalid mark field');if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100)throw new RangeError('Invalid marks value');}
 
 return {schoolId,studentId,className:className.trim(),subject:subject.trim(),section:section.trim(),marks:{...marks}};
}
