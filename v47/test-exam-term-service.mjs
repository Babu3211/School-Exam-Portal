import {EXAM_TERMS} from './term-catalog.mjs';
import assert from 'node:assert/strict';
import {createSchoolExamTerm,deleteSchoolExamTerm} from './exam-term-service.mjs';
const writes=[];let exists=false;
const api={doc:(_db,...parts)=>parts.join('/'),runTransaction:async(_db,fn)=>fn({get:async()=>({exists:()=>exists}),set:(path,data)=>writes.push({path,data})})};
const admin={uid:'admin-123',role:'school_admin',active:true,schoolId:'12345678'};
for(const term of EXAM_TERMS){
 const result=await createSchoolExamTerm({db:{},api,actor:admin,schoolId:'12345678',term});
 assert.equal(result.id,term);
 assert.equal(result.schoolId,'12345678');
 assert.equal(writes.at(-1).path,'schools/12345678/exams/'+term);
 assert.deepEqual(writes.at(-1).data,{schoolId:'12345678',term});
}
exists=true;
await assert.rejects(()=>createSchoolExamTerm({db:{},api,actor:admin,schoolId:'12345678',term:'1st'}),/already exists/i);
exists=false;
for(const invalid of ['midterm','Final','',null])await assert.rejects(()=>createSchoolExamTerm({db:{},api,actor:admin,schoolId:'12345678',term:invalid}),/term/i);
await assert.rejects(()=>createSchoolExamTerm({db:{},api,actor:admin,schoolId:'87654321',term:'1st'}),/permission/i);
await assert.rejects(()=>createSchoolExamTerm({db:{},api,actor:{role:'viewer',active:true,schoolId:'12345678'},schoolId:'12345678',term:'1st'}),/permission/i);
await assert.rejects(()=>deleteSchoolExamTerm(),/deletion unavailable/i);
assert.equal(writes.length,EXAM_TERMS.length,'failed creates must not write');
await assert.rejects(()=>createSchoolExamTerm({db:{},api:{doc:api.doc},actor:admin,schoolId:'12345678',term:'1st'}),/transaction/i);
await assert.rejects(()=>createSchoolExamTerm({db:{},api,actor:{role:'teacher',active:true,schoolId:'12345678'},schoolId:'12345678',term:'1st'}),/permission/i);
await assert.rejects(()=>createSchoolExamTerm({db:{},api,actor:{role:'super_admin',active:true},schoolId:'12345678',term:'1st'}),/permission/i);
// A revoked or reassigned admin must not write after the transaction read.
for(const mutate of [
 actor=>{actor.active=false},
 actor=>{actor.role='viewer'},
 actor=>{actor.schoolId='87654321'},
 actor=>{actor.uid='switched-user'}
]){
 const actor={role:'school_admin',active:true,schoolId:'12345678',uid:'admin-a'};
 const pending=[];
 const racingApi={
  doc:api.doc,
  runTransaction:async(_db,callback)=>{
   const tx={get:async()=>{mutate(actor);return {exists:()=>false}},set:(ref,data)=>pending.push([ref,data])};
   await callback(tx);
  }
 };
 await assert.rejects(createSchoolExamTerm({db:{},api:racingApi,actor,schoolId:'12345678',term:'monthly'}),/identity changed/);
 assert.equal(pending.length,0,'Revoked exam creator must not write');
}
console.log('V47 exam term creation and deletion guard tests passed');
