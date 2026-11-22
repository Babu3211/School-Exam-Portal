import assert from 'node:assert/strict';
import {validateSchoolSubject} from './subject-validation.mjs';
const base={id:'math',name:'Mathematics',class:'9',theoryFullMarks:'75',practicalFullMarks:'25'};
assert.equal(validateSchoolSubject(base).theoryFullMarks,75);
assert.equal(validateSchoolSubject({...base,theoryFullMarks:'125.5',practicalFullMarks:'.5'}).theoryFullMarks,125.5);
assert.equal(validateSchoolSubject({...base,theoryFullMarks:0,practicalFullMarks:'0'}).practicalFullMarks,0);
for(const value of ['abc','75abc','1,000','-1','Infinity','1e3','',null])assert.throws(()=>validateSchoolSubject({...base,theoryFullMarks:value}));
console.log('V47 Examination Settings decimal input validation passed');
