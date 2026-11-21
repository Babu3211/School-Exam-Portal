import assert from 'node:assert/strict';
import {verifySchoolSession} from './verified-school-session.mjs';
import {assertVerifiedTenantSession,selectTenantSession} from './tenant-session.mjs';
const schoolId='12345678',uid='teacher_123';
const records={
 'schools/12345678':{id:schoolId,active:true},
 'schools/12345678/members/teacher_123':{uid,schoolId,role:'teacher',active:true}
};
const readDocument=async path=>records[path]??null;
const base={schoolId,uid,readDocument};
const valid=await verifySchoolSession(base);
assert.equal(valid.role,'teacher');
assert.equal(valid.authorization,'firestore-verified-read');
assert.equal(Object.isFrozen(valid),true);
assert.equal(assertVerifiedTenantSession(valid,schoolId,uid),valid);
assert.throws(()=>assertVerifiedTenantSession(valid,'87654321',uid));
assert.throws(()=>assertVerifiedTenantSession(valid,schoolId,'wrong_uid'));
assert.throws(()=>assertVerifiedTenantSession(selectTenantSession([{schoolId,role:'teacher',active:true}],schoolId),schoolId,uid));
await assert.rejects(()=>verifySchoolSession({...base,schoolId:'87654321'}));
await assert.rejects(()=>verifySchoolSession({...base,uid:'other_123'}));
await assert.rejects(()=>verifySchoolSession({...base,uid:'../bad'}));
await assert.rejects(()=>verifySchoolSession({...base,readDocument:async path=>path==='schools/12345678'?{id:schoolId,active:false}:records[path]}));
await assert.rejects(()=>verifySchoolSession({...base,readDocument:async path=>path.includes('/members/')?{uid,schoolId,role:'viewer',active:false}:records[path]}));
await assert.rejects(()=>verifySchoolSession({...base,readDocument:async path=>path.includes('/members/')?{uid,schoolId:'87654321',role:'teacher',active:true}:records[path]}));
await assert.rejects(()=>verifySchoolSession({...base,readDocument:async path=>path.includes('/members/')?{uid,schoolId,role:'super_admin',active:true}:records[path]}));
await assert.rejects(()=>verifySchoolSession({...base,readDocument:async()=>{throw new Error('Permission denied')}}));
console.log('V47 verified school session checks passed');
