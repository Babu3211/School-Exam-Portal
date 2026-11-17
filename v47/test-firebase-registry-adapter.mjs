import assert from 'node:assert/strict';
import {makeRegistryAdapter} from './firebase-registry-adapter.mjs';
const stored=new Map();
const db={};
const adapter=makeRegistryAdapter({
 db,
 doc:(database,path)=>{assert.equal(database,db);return {path};},
 runTransaction:async(database,callback)=>{
  assert.equal(database,db);
  const writes=[];
  const result=await callback({
   get:async ref=>({exists:()=>stored.has(ref.path)}),
   set:(ref,data)=>writes.push([ref.path,data])
  });
  for(const [path,data] of writes)stored.set(path,data);
  return result;
 }
});
assert.deepEqual(await adapter.create('schools/schoolA',{active:false}),{path:'schools/schoolA'});
await assert.rejects(()=>adapter.create('schools/schoolA',{active:true}),/already exists/);
assert.deepEqual(stored.get('schools/schoolA'),{active:false});
await adapter.create('schools/schoolA/members/teacher1',{active:false});
assert.equal(stored.size,2);
await adapter.create('schools/schoolA/members/'+'u'.repeat(128),{active:false});
assert.equal(stored.size,3);
await assert.rejects(()=>adapter.create('students/x',{}),/Unapproved/);
await assert.rejects(()=>adapter.create('schools/schoolB',null),/Invalid/);
assert.throws(()=>makeRegistryAdapter({}),TypeError);
console.log('V47 atomic create-only transaction adapter tests passed');
