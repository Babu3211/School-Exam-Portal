import assert from 'node:assert/strict';
import {validateSchoolRegistration} from '../v47/school-registry.mjs';
const school=validateSchoolRegistration({id:'123456789',name:' Example School ',iemisCode:'123456789'});
assert.equal(school.name,'Example School');assert.equal(school.active,false);
assert.throws(()=>validateSchoolRegistration({id:'../school',name:'School'}));
assert.throws(()=>validateSchoolRegistration({id:'123456789',name:'X'}));
assert.throws(()=>validateSchoolRegistration({id:'123456789',name:'Example',iemisCode:'bad'}));
console.log('V47 school registration validation passed');
