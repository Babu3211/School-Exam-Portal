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
const actor={role:'super_admin',active:true};
const form={id:'school001',name:'Example Secondary School'};
const created=await onboardSchool({db:{},api,actor,form,adminUid:'teacher123'});
assert.equal(created.school.active,false);
assert.equal(docs.get('schools/school001/members/teacher123').role,'school_admin');
assert.equal(docs.size,2);
await assert.rejects(()=>onboardSchool({db:{},api,actor,form,adminUid:'teacher123'}),/already registered/);
assert.equal(docs.size,2);
await assert.rejects(()=>onboardSchool({db:{},api,actor:{role:'viewer',active:true},form:{...form,id:'school002'},adminUid:'teacher123'}));
assert.equal(docs.size,2);
console.log('V47 atomic school onboarding tests passed');
