import assert from 'node:assert/strict';
import {schoolReadiness} from '../v47/school-readiness.mjs';
const school={id:'school_001',active:true},member={schoolId:'school_001',active:true,role:'viewer'};
assert.equal(schoolReadiness({school,member,securityVerified:true}).ready,true);
assert.deepEqual(schoolReadiness({school,member}).issues,['security_unverified']);
assert.ok(schoolReadiness({school,member:{...member,schoolId:'school_002'},securityVerified:true}).issues.includes('school_mismatch'));
assert.ok(schoolReadiness({school:{...school,active:false},member,securityVerified:true}).issues.includes('school_inactive'));
console.log('V47 readiness checks passed');
