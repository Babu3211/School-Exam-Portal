import assert from 'node:assert/strict';
import {prepareSchoolRegistration} from '../v47/registration-policy.mjs';
const form={id:'school_001',name:'Example School'};
assert.equal(prepareSchoolRegistration({role:'super_admin',active:true},form).active,false);
assert.throws(()=>prepareSchoolRegistration({role:'school_admin',active:true},form));
assert.throws(()=>prepareSchoolRegistration({role:'super_admin',active:false},form));
console.log('Registration authorization tests passed');
