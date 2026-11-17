import {assertSchoolId,assertDocumentId} from './school-scope.mjs';
const CLASS_IDS=new Set(['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]);
export function assignmentRecord({schoolId,uid,classId,subjectId}){
 assertSchoolId(schoolId);assertDocumentId(uid);assertDocumentId(subjectId);
 if(!CLASS_IDS.has(classId))throw new TypeError('Invalid class');
 return {schoolId,uid,classId,subjectId,active:false};
}
export function assignmentKey({schoolId,uid,classId,subjectId}){
 const a=assignmentRecord({schoolId,uid,classId,subjectId});
 return [a.schoolId,a.uid,a.classId,a.subjectId].join(':');
}
