import {assertSchoolId} from './school-scope.mjs';
export function assignmentKey(schoolId,className,subject,section='ALL'){
 assertSchoolId(schoolId);
 for(const value of [className,subject,section])if(typeof value!=='string'||!value.trim()||value.includes('::')||value.length>160)throw new TypeError('Invalid assignment');
 return [schoolId,className.trim(),subject.trim(),section.trim()].join('::');
}
export function isAssigned(assigned,schoolId,className,subject,section=''){
 if(!Array.isArray(assigned))return false;
 return assigned.includes(assignmentKey(schoolId,className,subject,'ALL'))||(section?assigned.includes(assignmentKey(schoolId,className,subject,section)):false);
}
