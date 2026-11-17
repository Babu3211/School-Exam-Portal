import {validSchoolClass} from './class-catalog.mjs';
const ID=/^[A-Za-z0-9_-]{1,128}$/;
export function validateSubjectAssignment(input){if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Assignment required');const {studentId,subjectId}=input;if(typeof studentId!=='string'||!ID.test(studentId)||typeof subjectId!=='string'||!ID.test(subjectId))throw new Error('Invalid IDs');if(!validSchoolClass(input.class))throw new Error('Invalid class');return Object.freeze({studentId,subjectId,class:input.class})}
export function subjectAssignmentId(input){const a=validateSubjectAssignment(input);return a.studentId+'_'+a.subjectId}
