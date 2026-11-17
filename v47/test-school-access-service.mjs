import assert from 'node:assert/strict';
import {loadSchoolAccess} from './school-access-service.mjs';
const docs=new Map([
 ['schools/schoolA',{id:'schoolA',active:true}],
 ['schools/schoolA/members/userA',{uid:'userA',schoolId:'schoolA',active:true,role:'teacher'}],
 ['schools/schoolB',{id:'schoolB',active:true}],
 ['schools/schoolB/members/userB',{uid:'userB',schoolId:'schoolB',active:true,role:'viewer'}]
]);
const api={
 doc:(_db,...parts)=>parts.join('/'),
 getDoc:async path=>({exists:()=>docs.has(path),data:()=>docs.get(path)})
};
const args={db:{},api,uid:'userA'};
assert.equal((await loadSchoolAccess({...args,schoolId:'schoolA'})).role,'teacher');
assert.equal((await loadSchoolAccess({...args,schoolId:'schoolB'})).canRead,false);
assert.equal((await loadSchoolAccess({...args,schoolId:'schoolA',uid:'userB'})).canRead,false);
assert.equal((await loadSchoolAccess({...args,schoolId:'schoolC'})).canRead,false);
await assert.rejects(()=>loadSchoolAccess({...args,schoolId:'../schoolB'}),TypeError);
await assert.rejects(()=>loadSchoolAccess({...args,schoolId:'schoolA',isSuperAdmin:true}),/server-side/);
console.log('V47 authenticated school access lookup tests passed');
