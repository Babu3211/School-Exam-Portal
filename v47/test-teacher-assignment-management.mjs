import assert from 'node:assert/strict';
import {createTeacherAssignment,setTeacherAssignmentActive} from './teacher-assignment-management.mjs';
const schoolId='12345678',uid='teacher-a',classId='9',subjectId='math';
const actor={role:'school_admin',active:true,schoolId,uid:'admin-a'};
const base={schoolId,uid,classId,subjectId,actor,db:{}};
function setup(overrides={}){
 const key='teacher_assignments/12345678:teacher-a:9:math';
 const records=new Map([['members/teacher-a',{schoolId,uid,role:'teacher',active:true}]]);
 for(const [id,value] of Object.entries(overrides))value===null?records.delete(id):records.set(id,value);
 const writes=[];
 const api={
  doc:(_db,...parts)=>parts.slice(2).join('/'),
  runTransaction:async(_db,callback)=>{
   const pending=[];
   const tx={get:async ref=>({exists:()=>records.has(ref),data:()=>records.get(ref)}),
    set:(ref,value)=>pending.push(['set',ref,value]),
    update:(ref,value)=>pending.push(['update',ref,value])};
   const result=await callback(tx);
   for(const [method,ref,value] of pending){
    writes.push({method,ref,value});
    records.set(ref,method==='update'?{...records.get(ref),...value}:value);
   }
   return result;
  }
 };
 return {api,records,writes,key};
}
{
 const state=setup();
 const created=await createTeacherAssignment({...base,api:state.api});
 assert.equal(created.active,false);
 assert.equal(state.writes.length,1);
 assert.equal(state.writes[0].ref,state.key);
 await setTeacherAssignmentActive({...base,api:state.api,active:true});
 assert.equal(state.records.get(state.key).active,true);
 await setTeacherAssignmentActive({...base,api:state.api,active:false});
 assert.equal(state.records.get(state.key).active,false);
}
for(const [change,pattern] of [
 [{'members/teacher-a':null},/Active teacher membership/],
 [{'members/teacher-a':{schoolId,uid,role:'teacher',active:false}},/Active teacher membership/],
 [{'members/teacher-a':{schoolId,uid,role:'viewer',active:true}},/Active teacher membership/],
 [{'members/teacher-a':{schoolId:'87654321',uid,role:'teacher',active:true}},/Active teacher membership/],
 [{'members/teacher-a':{schoolId,uid:'imposter-teacher',role:'teacher',active:true}},/Active teacher membership/],
 [{'teacher_assignments/12345678:teacher-a:9:math':{schoolId,uid,classId,subjectId,active:false}},/already exists/]
 ]){
 const state=setup(change);
 await assert.rejects(createTeacherAssignment({...base,api:state.api}),pattern);
 assert.equal(state.writes.length,0);
}
for(const [change,pattern] of [
 [{},/Assignment missing/],
 [{'teacher_assignments/12345678:teacher-a:9:math':{schoolId:'87654321',uid,classId,subjectId,active:false}},/identity mismatch/],
 [{'teacher_assignments/12345678:teacher-a:9:math':{schoolId,uid,classId,subjectId,active:false},'members/teacher-a':{schoolId,uid,role:'teacher',active:false}},/Active teacher membership/],
 [{'teacher_assignments/12345678:teacher-a:9:math':{schoolId,uid,classId,subjectId,active:false},'members/teacher-a':{schoolId,uid:'different-teacher',role:'teacher',active:true}},/Active teacher membership/]
 ]){
 const state=setup(change);
 await assert.rejects(setTeacherAssignmentActive({...base,api:state.api,active:true}),pattern);
 assert.equal(state.writes.length,0);
}
{
 const state=setup({'teacher_assignments/12345678:teacher-a:9:math':{schoolId,uid,classId,subjectId,active:true},'members/teacher-a':null});
 await setTeacherAssignmentActive({...base,api:state.api,active:false});
 assert.equal(state.records.get(state.key).active,false);
}
for(const badActor of [{role:'viewer',active:true,schoolId},{role:'super_admin',active:true},{role:'school_admin',active:true,schoolId:'87654321'}]){
 const state=setup();
 await assert.rejects(createTeacherAssignment({...base,actor:badActor,api:state.api}),/School Admin/);
 assert.equal(state.writes.length,0);
}
{
 const state=setup({'teacher_assignments/12345678:teacher-a:9:math':{schoolId,uid,classId,subjectId,active:'yes'}});
 await assert.rejects(setTeacherAssignmentActive({...base,api:state.api,active:true}),/status invalid/);
 assert.equal(state.writes.length,0);
}
{
 const state=setup({'teacher_assignments/12345678:teacher-a:9:math':{schoolId,uid,classId,subjectId,active:false}});
 await assert.rejects(setTeacherAssignmentActive({...base,api:state.api,active:'yes'}),/Active must be boolean/);
 assert.equal(state.writes.length,0);
}
// Forged membership UID must be rejected on both create and activation.
for(const action of ['create','activate']){
 const state=setup({
  'members/teacher-a':{schoolId,uid:'imposter-teacher',role:'teacher',active:true},
  ...(action==='activate'?{[stateKey()]:{schoolId,uid,classId,subjectId,active:false}}:{})
 });
 const params={...base,api:state.api};
 await assert.rejects(
  action==='create'?createTeacherAssignment(params):setTeacherAssignmentActive({...params,active:true}),
  /Active teacher membership/
 );
 assert.equal(state.writes.length,0);
}
// Invalid target roles must not be able to create or reactivate assignments.
for(const role of ['viewer','school_admin','super_admin']){
 const state=setup({
  'members/teacher-a':{schoolId,uid,role,active:true},
  [stateKey()]:{schoolId,uid,classId,subjectId,active:false}
 });
 await assert.rejects(setTeacherAssignmentActive({...base,api:state.api,active:true}),/Active teacher membership/);
 assert.equal(state.writes.length,0);
}
// Assignment creation and activation must fail if the admin session changes
// after the transaction has started, with no partial writes.
for(const action of ['create','activate']){
 for(const mutate of [
  a=>{a.active=false},
  a=>{a.role='viewer'},
  a=>{a.schoolId='87654321'},
  a=>{a.uid='other-admin'}
 ]){
  const changingActor={...actor};
  const state=setup(action==='activate'?{[stateKey()]:{schoolId,uid,classId,subjectId,active:false}}:{});
  const original=state.api.runTransaction;
  state.api.runTransaction=(db,callback)=>original(db,async tx=>{
   const get=tx.get;
   let changed=false;
   tx.get=async ref=>{const result=await get(ref);if(!changed){changed=true;mutate(changingActor)}return result};
   return callback(tx);
  });
  const params={...base,actor:changingActor,api:state.api};
  await assert.rejects(action==='create'?createTeacherAssignment(params):setTeacherAssignmentActive({...params,active:true}),/identity changed/);
  assert.equal(state.writes.length,0,'Revoked admin must not change teacher assignments');
 }
}
function stateKey(){return 'teacher_assignments/12345678:teacher-a:9:math'}
console.log('V47 teacher assignment transaction tests passed');
