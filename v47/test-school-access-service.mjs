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
const args={db:{},api,auth:{currentUser:{uid:'userA'}},uid:'userA'};
assert.equal((await loadSchoolAccess({...args,schoolId:'schoolA'})).role,'teacher');
assert.equal((await loadSchoolAccess({...args,schoolId:'schoolB'})).canRead,false);
await assert.rejects(()=>loadSchoolAccess({...args,schoolId:'schoolA',uid:'userB'}),/does not match/);
assert.equal((await loadSchoolAccess({...args,schoolId:'schoolC'})).canRead,false);
await assert.rejects(()=>loadSchoolAccess({...args,schoolId:'../schoolB'}),TypeError);
await assert.rejects(()=>loadSchoolAccess({...args,schoolId:'schoolA',isSuperAdmin:true}),/server-side/);
await assert.rejects(()=>loadSchoolAccess({...args,auth:{currentUser:null},schoolId:'schoolA'}),/does not match/);
const inactiveDocs=new Map(docs);
inactiveDocs.set('schools/schoolA',{id:'schoolA',active:false});
const inactiveApi={...api,getDoc:async path=>({exists:()=>inactiveDocs.has(path),data:()=>inactiveDocs.get(path)})};
assert.equal((await loadSchoolAccess({...args,api:inactiveApi,schoolId:'schoolA'})).canRead,false);
const deniedApi={...api,getDoc:async()=>{throw Object.assign(new Error('denied'),{code:'permission-denied'})}};
assert.equal((await loadSchoolAccess({...args,api:deniedApi,schoolId:'schoolA'})).canRead,false);
const offlineApi={...api,getDoc:async()=>{throw Object.assign(new Error('offline'),{code:'unavailable'})}};
await assert.rejects(()=>loadSchoolAccess({...args,api:offlineApi,schoolId:'schoolA'}),/offline/);
console.log('V47 authenticated school access lookup tests passed');
