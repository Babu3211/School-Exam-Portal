import assert from 'node:assert/strict';
import {resolveSchoolContext} from '../v47/school-context.mjs';
const member={role:'school_admin',schoolId:'12345678',active:true};
assert.equal(resolveSchoolContext(member,'12345678').schoolId,'12345678');
assert.throws(()=>resolveSchoolContext(member,'87654321'));
assert.throws(()=>resolveSchoolContext({...member,active:false},'12345678'));
assert.throws(()=>resolveSchoolContext({...member,role:'unexpected'},'12345678'));
assert.equal(resolveSchoolContext({role:'super_admin',active:true},'87654321').schoolId,'87654321');
console.log('School context tests passed');
