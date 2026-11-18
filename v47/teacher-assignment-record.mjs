import {assertSchoolId,assertDocumentId} from './school-scope.mjs';
export function validateTeacherAssignment({schoolId,teacherUid,className,subject,section='ALL',active=false}){
 assertSchoolId(schoolId);assertDocumentId(teacherUid);
 for(const field of [className,subject,section])if(typeof field!=='string'||!field.trim()||field.length>160||field.includes('::'))throw new TypeError('Invalid assignment field');
 if(typeof active!=='boolean')throw new TypeError('Invalid assignment state');
 return {schoolId,teacherUid,className:className.trim(),subject:subject.trim(),section:section.trim(),active};
}
export function teacherAssignmentDocumentId(teacherUid,className,subject,section='ALL'){
 assertDocumentId(teacherUid);
 for(const field of [className,subject,section])if(typeof field!=='string'||!field.trim()||field.length>160)throw new TypeError('Invalid assignment field');
 // Do not use this as a Firestore ID: deterministic hashing is required before persistence.
 return [teacherUid,className.trim(),subject.trim(),section.trim()].join('::');
}
