import {validateExamTerm} from './term-catalog.mjs';
const ID=/^[A-Za-z0-9_-]{1,128}$/;
// Explicit V47 development input: user-specified 4/36/10, not an official CDC grading policy.
export const COMPUTER_COMPONENT_MAX=Object.freeze({component_a:4,component_b:36,component_c:10});
export function validateComputerComponentEntry(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Component entry required');
 const {studentId,subjectId}=input;
 if(typeof studentId!=='string'||!ID.test(studentId)||typeof subjectId!=='string'||!ID.test(subjectId))throw new Error('Invalid student or subject ID');
 if(!['9','10'].includes(input.class))throw new Error('Computer component entry is limited to Class 9 and 10');
 const term=validateExamTerm(input.term),scores=input.scores;
 if(!scores||typeof scores!=='object'||Array.isArray(scores)||Object.keys(scores).length!==3||Object.keys(scores).some(k=>!Object.hasOwn(COMPUTER_COMPONENT_MAX,k)))throw new Error('Exactly three component scores required');
 const normalized={};for(const [key,max]of Object.entries(COMPUTER_COMPONENT_MAX)){
  const value=scores[key];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max)throw new Error('Invalid '+key+' score (max '+max+')');normalized[key]=value;
 }
 return Object.freeze({studentId,subjectId,class:input.class,term,scores:Object.freeze(normalized)});
}
export function computerComponentEntryId(input){const entry=validateComputerComponentEntry(input);return entry.term+':'+entry.studentId+':'+entry.subjectId}
