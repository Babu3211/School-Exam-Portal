import assert from 'node:assert/strict';import {validateSchoolSubject} from '../v47/subject-validation.mjs';
const good={id:'math_6',name:' Mathematics ',class:'6'};
assert.deepEqual(validateSchoolSubject(good),{id:'math_6',name:'Mathematics',class:'6',active:true});
for(const bad of [{...good,id:'bad/id'},{...good,name:' '},{...good,class:'13'},{...good,active:'true'},null])assert.throws(()=>validateSchoolSubject(bad));
console.log('V47 subject validation tests passed');
