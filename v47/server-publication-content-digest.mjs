// Stable content integrity for immutable official marks pages. Node-only.
import {createHash} from 'node:crypto';
import {validateConfiguredMarkComponents} from './configured-mark-preflight.mjs';

function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object'){
  return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 }
 if(typeof value==='number'&&!Number.isFinite(value))throw Error('Invalid staged mark number');
 if(value===undefined)throw Error('Undefined staged mark content');
 return value;
}
export function computePublishedPagesDigest(pages){
 if(!Array.isArray(pages)||pages.length<1||pages.length>15)throw Error('Complete committed pages required');
 return createHash('sha256').update(JSON.stringify(canonical(pages.map(p=>({
  index:p.index,count:p.count,firstStudentId:p.firstStudentId,
  lastStudentId:p.lastStudentId,entries:p.entries
 }))))).digest('hex');
}

// Bind the actual ordered grading components, not a draft revision or a mutable label.
export function computeOfficialSettingsDigest(settings,scope){
 const components=validateConfiguredMarkComponents(settings,scope);
 return createHash('sha256').update(JSON.stringify(canonical({
  schoolId:scope.schoolId,classId:scope.classId,subjectId:scope.subjectId,examId:scope.examId,components
 }))).digest('hex');
}
