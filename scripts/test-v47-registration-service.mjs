import assert from 'node:assert/strict';
import {registerSchool} from '../v47/registration-service.mjs';
const writes=[];let exists=false;
const api={doc:(_db,...path)=>path.join('/'),runTransaction:async(_db,callback)=>callback({get:async()=>({exists:()=>exists}),set:(...args)=>writes.push(args)})};
const form={id:'12345678',iemisCode:'12345678',name:'Sample School'};
await assert.rejects(()=>registerSchool({db:{},api,actor:{active:true,role:'viewer'},form}));
assert.equal(writes.length,0);
await assert.rejects(()=>registerSchool({db:{},api,actor:{active:true,role:'super_admin'},form}),/Only active Super Admin/);
assert.equal(writes.length,0,'Missing Super Admin UID must not write');
const result=await registerSchool({db:{},api,actor:{uid:'super123',active:true,role:'super_admin'},form});
assert.equal(result.active,false);assert.equal(writes[0][0],'schools/12345678');
exists=true;
await assert.rejects(()=>registerSchool({db:{},api,actor:{uid:'super123',active:true,role:'super_admin'},form}),/already exists/);
assert.equal(writes.length,1);
// Authentication or permission changes during the transaction must not write.
for(const mutate of [
 admin=>{admin.active=false},
 admin=>{admin.role='viewer'},
 admin=>{admin.uid='different_admin'}
]){
 const current={uid:'super123',active:true,role:'super_admin'},pending=[];
 const racingApi={doc:api.doc,runTransaction:async(_db,fn)=>fn({
  get:async()=>{mutate(current);return {exists:()=>false}},
  set:(...args)=>pending.push(args)
 })};
 await assert.rejects(()=>registerSchool({
  db:{},api:racingApi,actor:current,
  form:{...form,id:'87654321',iemisCode:'87654321'}
 }),/identity changed/);
 assert.equal(pending.length,0,'Failed authorization must not stage a school');
}
console.log('V47 registration service authorization and duplicate prevention passed');
