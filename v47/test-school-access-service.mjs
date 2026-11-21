import assert from 'node:assert/strict';
import {loadSchoolAccess} from './school-access-service.mjs';
const docs=new Map([
 ['schools/12345678',{id:'12345678',active:true}],
 ['schools/12345678/members/userA',{uid:'userA',schoolId:'12345678',active:true,role:'teacher'}],
 ['schools/87654321',{id:'87654321',active:true}],
 ['schools/87654321/members/userB',{uid:'userB',schoolId:'87654321',active:true,role:'viewer'}]
]);
const api={
 doc:(_db,...parts)=>parts.join('/'),
 getDoc:async path=>({exists:()=>docs.has(path),data:()=>docs.get(path)})
};
const args={db:{},api,auth:{currentUser:{uid:'userA'}},uid:'userA'};
assert.equal((await loadSchoolAccess({...args,schoolId:'12345678'})).role,'teacher');
assert.equal((await loadSchoolAccess({...args,schoolId:'87654321'})).canRead,false);
await assert.rejects(()=>loadSchoolAccess({...args,schoolId:'12345678',uid:'userB'}),/does not match/);
assert.equal((await loadSchoolAccess({...args,schoolId:'11223344'})).canRead,false);
await assert.rejects(()=>loadSchoolAccess({...args,schoolId:'../87654321'}),/IEMIS number/);
await assert.rejects(()=>loadSchoolAccess({...args,schoolId:'12345678',isSuperAdmin:true}),/server-side/);
await assert.rejects(()=>loadSchoolAccess({...args,auth:{currentUser:null},schoolId:'12345678'}),/does not match/);
const inactiveDocs=new Map(docs);
inactiveDocs.set('schools/12345678',{id:'12345678',active:false});
const inactiveApi={...api,getDoc:async path=>({exists:()=>inactiveDocs.has(path),data:()=>inactiveDocs.get(path)})};
assert.equal((await loadSchoolAccess({...args,api:inactiveApi,schoolId:'12345678'})).canRead,false);
const deniedApi={...api,getDoc:async()=>{throw Object.assign(new Error('denied'),{code:'permission-denied'})}};
assert.equal((await loadSchoolAccess({...args,api:deniedApi,schoolId:'12345678'})).canRead,false);
const offlineApi={...api,getDoc:async()=>{throw Object.assign(new Error('offline'),{code:'unavailable'})}};
await assert.rejects(()=>loadSchoolAccess({...args,api:offlineApi,schoolId:'12345678'}),/offline/);
console.log('V47 authenticated school access lookup tests passed');
