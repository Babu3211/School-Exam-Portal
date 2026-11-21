import assert from 'node:assert/strict';
import {validateRegistrationForm} from './school-registration-form.mjs';
const good=validateRegistrationForm({id:'123456789',name:'Shree Example Secondary School',iemisCode:'123456789'});
assert.equal(good.ok,true);assert.equal(good.record.active,false);
assert.equal(validateRegistrationForm({id:'a',name:'X'}).ok,false);
assert.equal(validateRegistrationForm({id:'123456789',name:'Example School',iemisCode:'not-numeric'}).ok,false);
console.log('V47 registration form validation tests passed');
