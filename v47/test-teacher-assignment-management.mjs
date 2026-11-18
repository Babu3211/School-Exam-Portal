import assert from 'node:assert/strict';
import {createTeacherAssignment,setTeacherAssignmentActive} from './teacher-assignment-management.mjs';
const schoolId='school-a',uid='teacher-a',classId='9',subjectId='math';
const actor={role:'school_admin',active:true,schoolId,uid:'admin-a'};
const base={schoolId,uid,classId,subjectId,actor,db:{}};
function setup(overrides={}){
 const key='teacher_assignments/school-a:teacher-a:9:math';
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
 [{'members/teacher-a':{schoolId:'school-b',uid,role:'teacher',active:true}},/Active teacher membership/],
 [{'teacher_assignments/school-a:teacher-a:9:math':{schoolId,uid,classId,subjectId,active:false}},/already exists/]
 ]){
 const state=setup(change);
 await assert.rejects(createTeacherAssignment({...base,api:state.api}),pattern);
 assert.equal(state.writes.length,0);
}
for(const [change,pattern] of [
 [{},/Assignment missing/],
 [{'teacher_assignments/school-a:teacher-a:9:math':{schoolId:'school-b',uid,classId,subjectId,active:false}},/identity mismatch/],
 [{'teacher_assignments/school-a:teacher-a:9:math':{schoolId,uid,classId,subjectId,active:false},'members/teacher-a':{schoolId,uid,role:'teacher',active:false}},/Active teacher membership/]
 ]){
 const state=setup(change);
 await assert.rejects(setTeacherAssignmentActive({...base,api:state.api,active:true}),pattern);
 assert.equal(state.writes.length,0);
}
{
 const state=setup({'teacher_assignments/school-a:teacher-a:9:math':{schoolId,uid,classId,subjectId,active:true},'members/teacher-a':null});
 await setTeacherAssignmentActive({...base,api:state.api,active:false});
 assert.equal(state.records.get(state.key).active,false);
}
for(const badActor of [{role:'viewer',active:true,schoolId},{role:'school_admin',active:true,schoolId:'school-b'}]){
 const state=setup();
 await assert.rejects(createTeacherAssignment({...base,actor:badActor,api:state.api}),/School Admin/);
 assert.equal(state.writes.length,0);
}
console.log('V47 teacher assignment transaction tests passed');
