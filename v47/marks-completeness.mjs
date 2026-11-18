import {assertSchoolId} from './school-scope.mjs';
export function validateCompleteMarks(schoolId,studentIds,marksByStudent){
 assertSchoolId(schoolId);
 if(!Array.isArray(studentIds)||studentIds.length===0||new Set(studentIds).size!==studentIds.length||studentIds.some(id=>typeof id!=='string'||!id.trim()))throw new TypeError('Invalid student roster');
 if(!marksByStudent||typeof marksByStudent!=='object'||Array.isArray(marksByStudent))throw new TypeError('Marks map required');
 const missing=studentIds.filter(id=>!Object.hasOwn(marksByStudent,id)||marksByStudent[id]===null||marksByStudent[id]===undefined||marksByStudent[id]===''||(typeof marksByStudent[id]==='number'&&!Number.isFinite(marksByStudent[id])));
 return {complete:missing.length===0,missing};
}
