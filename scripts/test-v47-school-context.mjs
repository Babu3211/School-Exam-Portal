import assert from 'node:assert/strict';
import {resolveSchoolContext} from '../v47/school-context.mjs';
const member={role:'school_admin',schoolId:'school_001',active:true};
assert.equal(resolveSchoolContext(member,'school_001').schoolId,'school_001');
assert.throws(()=>resolveSchoolContext(member,'school_002'));
assert.throws(()=>resolveSchoolContext({...member,active:false},'school_001'));
assert.equal(resolveSchoolContext({role:'super_admin',active:true},'school_002').schoolId,'school_002');
console.log('School context tests passed');
