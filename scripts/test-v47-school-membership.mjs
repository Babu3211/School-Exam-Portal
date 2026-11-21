import assert from 'node:assert/strict';
import {validateMembership} from '../v47/school-membership.mjs';
const member=validateMembership({uid:'user_12345',schoolId:'12345678',role:'viewer'});
assert.equal(member.active,false);
for(const role of ['super_admin','owner',''])assert.throws(()=>validateMembership({uid:'user_12345',schoolId:'12345678',role}));
assert.throws(()=>validateMembership({uid:'user_12345',schoolId:'../other',role:'teacher'}));
console.log('V47 membership validation passed');
