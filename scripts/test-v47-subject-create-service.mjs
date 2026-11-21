import assert from 'node:assert/strict';import {createSchoolSubject} from '../v47/subject-create-service.mjs';
const docs=new Map(),actor={role:'school_admin',active:true,schoolId:'12345678'},input={id:'math',name:'Mathematics',class:'6'};
const api={doc:(_db,...p)=>p.join('/'),runTransaction:async(_db,callback)=>{const writes=[];await callback({get:async ref=>({exists:()=>docs.has(ref)}),set:(ref,data)=>writes.push([ref,data])});for(const [ref,data]of writes)docs.set(ref,data)}};
const args={db:{},api,actor,schoolId:'12345678',input};
assert.equal((await createSchoolSubject(args)).id,'math');assert.equal(docs.get('schools/12345678/subjects/math').class,'6');
await assert.rejects(()=>createSchoolSubject(args),/already exists/);
await assert.rejects(()=>createSchoolSubject({...args,actor:{...actor,role:'viewer'}}));
await assert.rejects(()=>createSchoolSubject({...args,schoolId:'87654321'}));
console.log('V47 subject create-only tests passed');
