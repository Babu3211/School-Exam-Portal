import {assertSchoolId} from './school-scope.mjs';
export function validateCompleteMarks(schoolId,studentIds,marksByStudent){
 assertSchoolId(schoolId);
 if(!Array.isArray(studentIds)||studentIds.length===0||new Set(studentIds).size!==studentIds.length)throw new TypeError('Invalid student roster');
 if(!marksByStudent||typeof marksByStudent!=='object'||Array.isArray(marksByStudent))throw new TypeError('Marks map required');
 const missing=studentIds.filter(id=>!Object.hasOwn(marksByStudent,id)||marksByStudent[id]===null||marksByStudent[id]==='');
 return {complete:missing.length===0,missing};
}
