import assert from 'node:assert/strict';import {validateStudent} from '../v47/student-validation.mjs';
assert.deepEqual(validateStudent({name:'  Ram Sharma ',class:'ECD'}),{name:'Ram Sharma',class:'ECD'});
assert.deepEqual(validateStudent({name:'Sita',class:'12',rollNo:' 5 '}),{name:'Sita',class:'12',rollNo:'5'});
assert.throws(()=>validateStudent({name:'X',class:'1'}));assert.throws(()=>validateStudent({name:'Ram',class:'13'}));
console.log('V47 student validation passed');
