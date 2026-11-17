import assert from 'node:assert/strict';import {auditLoadedMarks} from '../v47/marks-audit.mjs';
const base={studentId:'s1',subjectId:'math',class:'6',term:'1st',theory:35,practical:8};
assert.deepEqual(auditLoadedMarks([base],{schoolClass:'6',term:'1st'}),{checked:1,issueCount:0,issues:[],complete:false});
const result=auditLoadedMarks([base,{...base},{...base,studentId:'s2',class:'7',theory:-1,practical:'8'},{...base,studentId:''}],{schoolClass:'6',term:'1st'});
assert.deepEqual(result.issues.map(i=>i.code),['duplicate_student_subject','wrong_class_or_term','invalid_theory','invalid_practical','missing_identity']);
assert.deepEqual(auditLoadedMarks([{...base,studentId:'bad:id'}],{schoolClass:'6',term:'1st'}).issues.map(i=>i.code),['missing_identity']);
assert.equal(result.complete,false);assert.throws(()=>auditLoadedMarks([], {schoolClass:'13',term:'1st'}));
console.log('V47 raw mark data audit tests passed');
