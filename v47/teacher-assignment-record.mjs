import {assertSchoolId,assertDocumentId} from './school-scope.mjs';
export function validateTeacherAssignment({schoolId,teacherUid,className,subject,section='ALL',active=false}){
 assertSchoolId(schoolId);assertDocumentId(teacherUid);
 if(teacherUid.length<6)throw new TypeError('Invalid teacher UID');
 for(const field of [className,subject,section])if(typeof field!=='string'||!field.trim()||field.length>160||field.includes('::'))throw new TypeError('Invalid assignment field');
 if(typeof active!=='boolean')throw new TypeError('Invalid assignment state');
 return {schoolId,teacherUid,className:className.trim(),subject:subject.trim(),section:section.trim(),active};
}
export function teacherAssignmentDocumentId(teacherUid,className,subject,section='ALL'){
 assertDocumentId(teacherUid);
 if(teacherUid.length<6)throw new TypeError('Invalid teacher UID');
 for(const field of [className,subject,section])if(typeof field!=='string'||!field.trim()||field.length>160||field.includes('::'))throw new TypeError('Invalid assignment field');
 // Human-readable comparison key only; NOT a Firestore document ID or authorization proof.
 return [teacherUid,className.trim(),subject.trim(),section.trim()].join('::');
}
