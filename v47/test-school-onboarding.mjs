import assert from 'node:assert/strict';
import {onboardSchool} from './school-onboarding.mjs';
const docs=new Map();
const api={
 doc:(_db,...segments)=>segments.join('/'),
 runTransaction:async(_db,fn)=>{
  const writes=[];
  const tx={get:async path=>({exists:()=>docs.has(path)}),set:(path,data)=>writes.push([path,data])};
  const result=await fn(tx);
  for(const [path,data] of writes)docs.set(path,data);
  return result;
 }
};
const actor={uid:'super_123',role:'super_admin',active:true};
const form={id:'12345678',iemisCode:'12345678',name:'Example Secondary School'};
const created=await onboardSchool({db:{},api,actor,form,adminUid:'teacher123'});
assert.equal(created.school.active,false);
assert.equal(docs.get('schools/12345678/members/teacher123').role,'school_admin');
assert.equal(docs.size,2);
await assert.rejects(()=>onboardSchool({db:{},api,actor,form,adminUid:'teacher123'}),/already registered/);
assert.equal(docs.size,2);
await assert.rejects(()=>onboardSchool({db:{},api,actor:{role:'viewer',active:true},form:{...form,id:'87654321'},adminUid:'teacher123'}));
assert.equal(docs.size,2);
// Revoked creator or account switch cannot stage a school or member.
for(const mutate of [
 admin=>{admin.active=false},
 admin=>{admin.role='viewer'},
 admin=>{admin.uid='different_admin'}
]){
 const current={...actor},pending=[];
 const racingApi={doc:api.doc,runTransaction:async(_db,fn)=>fn({
  get:async()=>{mutate(current);return {exists:()=>false}},
  set:(path,data)=>pending.push([path,data])
 })};
 await assert.rejects(()=>onboardSchool({
  db:{},api:racingApi,actor:current,
  form:{...form,id:'87654321',iemisCode:'87654321'},adminUid:'teacher123'
 }),/identity changed/);
 assert.equal(pending.length,0,'Revoked or switched admin must not stage writes');
}
await assert.rejects(()=>onboardSchool({
 db:{},api,actor:{role:'super_admin',active:true},form,adminUid:'teacher123'
}),/Only active Super Admin/);
console.log('V47 atomic school onboarding tests passed');
