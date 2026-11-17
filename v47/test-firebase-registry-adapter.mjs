import assert from 'node:assert/strict';
import {makeRegistryAdapter} from './firebase-registry-adapter.mjs';
const adapter=makeRegistryAdapter({db:{},doc:()=>{},setDoc:async()=>{}});
await assert.rejects(()=>adapter.create('schools/schoolA',{active:false}),/trusted server/);
await assert.rejects(()=>adapter.create('students/x',{}),/Unapproved/);
assert.throws(()=>makeRegistryAdapter({}),TypeError);
console.log('V47 registry adapter fail-closed tests passed');
