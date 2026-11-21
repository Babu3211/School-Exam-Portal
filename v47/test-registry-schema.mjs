import assert from 'node:assert/strict';
import {newSchoolRecord,newMembership} from './registry-schema.mjs';
assert.deepEqual(newSchoolRecord({id:'12345678',name:'Example School'}),{id:'12345678',name:'Example School',iemisCode:'',active:false});
assert.equal(newMembership({uid:'user1',schoolId:'12345678',role:'viewer'}).active,false);
assert.equal(newMembership({uid:'u'.repeat(128),schoolId:'12345678',role:'teacher'}).uid.length,128);
assert.throws(()=>newMembership({uid:'u'.repeat(129),schoolId:'12345678',role:'teacher'}));
for(const role of ['super_admin','owner','admin','']) assert.throws(()=>newMembership({uid:'user1',schoolId:'12345678',role}));
for(const iemisCode of ['abc','1234','12/345']) assert.throws(()=>newSchoolRecord({id:'12345678',name:'Example School',iemisCode}));
console.log('V47 registry schema tests passed');
