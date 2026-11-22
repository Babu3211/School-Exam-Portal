import assert from 'node:assert/strict';import {validateSchoolSubject} from '../v47/subject-validation.mjs';
const good={id:'math_6',name:' Mathematics ',class:'6',theoryFullMarks:40,practicalFullMarks:10,creditHour:4};
assert.deepEqual(validateSchoolSubject(good),{id:'math_6',name:'Mathematics',class:'6',active:true,creditHour:4,theoryFullMarks:40,practicalFullMarks:10});
for(const bad of [{...good,id:'bad/id'},{...good,name:' '},{...good,class:'13'},{...good,active:'true'},{...good,creditHour:0},{...good,theoryFullMarks:undefined},{...good,practicalFullMarks:-1},null])assert.throws(()=>validateSchoolSubject(bad));
assert.equal(validateSchoolSubject({...good,id:'custom',theoryFullMarks:240,practicalFullMarks:60,creditHour:2.5}).theoryFullMarks,240,'Configured marks are not hardcoded to 100');
console.log('V47 subject validation tests passed');
