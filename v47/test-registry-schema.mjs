import assert from 'node:assert/strict';
import {newSchoolRecord,newMembership} from './registry-schema.mjs';
assert.deepEqual(newSchoolRecord({id:'school1',name:'Example School'}),{id:'school1',name:'Example School',iemisCode:'',active:false});
assert.equal(newMembership({uid:'user1',schoolId:'school1',role:'viewer'}).active,false);
for(const role of ['super_admin','owner','admin','']) assert.throws(()=>newMembership({uid:'user1',schoolId:'school1',role}));
for(const iemisCode of ['abc','1234','12/345']) assert.throws(()=>newSchoolRecord({id:'school1',name:'Example School',iemisCode}));
console.log('V47 registry schema tests passed');
