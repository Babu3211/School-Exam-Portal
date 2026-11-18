import assert from 'node:assert/strict';
import {verifySchoolSession} from './verified-school-session.mjs';
const schoolId='school_A',uid='teacher_123';
const records={
 'schools/school_A':{id:schoolId,active:true},
 'schools/school_A/members/teacher_123':{uid,schoolId,role:'teacher',active:true}
};
const readDocument=async path=>records[path]??null;
const base={schoolId,uid,readDocument};
const valid=await verifySchoolSession(base);
assert.equal(valid.role,'teacher');
assert.equal(valid.authorization,'firestore-verified-read');
assert.equal(Object.isFrozen(valid),true);
await assert.rejects(()=>verifySchoolSession({...base,schoolId:'school_B'}));
await assert.rejects(()=>verifySchoolSession({...base,uid:'other_123'}));
await assert.rejects(()=>verifySchoolSession({...base,uid:'../bad'}));
await assert.rejects(()=>verifySchoolSession({...base,readDocument:async path=>path==='schools/school_A'?{id:schoolId,active:false}:records[path]}));
await assert.rejects(()=>verifySchoolSession({...base,readDocument:async path=>path.includes('/members/')?{uid,schoolId,role:'viewer',active:false}:records[path]}));
await assert.rejects(()=>verifySchoolSession({...base,readDocument:async path=>path.includes('/members/')?{uid,schoolId:'school_B',role:'teacher',active:true}:records[path]}));
await assert.rejects(()=>verifySchoolSession({...base,readDocument:async path=>path.includes('/members/')?{uid,schoolId,role:'super_admin',active:true}:records[path]}));
await assert.rejects(()=>verifySchoolSession({...base,readDocument:async()=>{throw new Error('Permission denied')}}));
console.log('V47 verified school session checks passed');
