import assert from 'node:assert/strict';
import {saveClassAttendance} from './attendance-bulk.mjs';
import {saveSchoolAttendance} from './attendance-service.mjs';
const schoolId='school-a',actor={role:'school_admin',active:true,schoolId};
const entry=id=>({studentId:id,class:'9',date:'2026-11-18',present:true});
function mock(overrides={}){
 const records=new Map([['s1',{schoolId,class:'9'}],['s2',{schoolId,class:'9'}]]);
 for(const [id,value] of Object.entries(overrides))value===null?records.delete(id):records.set(id,value);
 const writes=[];
 const api={
  doc:(_db,...parts)=>parts.join('/'),
  getDoc:async ref=>{const data=records.get(ref.split('/').at(-1));return {exists:()=>!!data,data:()=>data};},
  setDoc:async(ref,data)=>{writes.push([ref,data]);},
  writeBatch:()=>{const pending=[];return {set:(ref,data)=>pending.push([ref,data]),commit:async()=>writes.push(...pending)}}
 };
 return {api,writes};
}
{
 const state=mock();
 const result=await saveClassAttendance({db:{},api:state.api,actor,schoolId,entries:[entry('s1'),entry('s2')]});
 assert.equal(result.saved,2);assert.equal(state.writes.length,2);
}
{
 const state=mock();
 const result=await saveSchoolAttendance({db:{},api:state.api,actor,schoolId,input:entry('s1')});
 assert.equal(result.studentId,'s1');assert.equal(state.writes.length,1);
}
for(const overrides of [
 {s2:null},
 {s2:{schoolId:'school-b',class:'9'}},
 {s2:{schoolId,class:'8'}}
]){
 const state=mock(overrides);
 await assert.rejects(saveClassAttendance({db:{},api:state.api,actor,schoolId,entries:[entry('s1'),entry('s2')]}),/Student roster/);
 assert.equal(state.writes.length,0);
 await assert.rejects(saveSchoolAttendance({db:{},api:state.api,actor,schoolId,input:entry('s2')}),/Student roster/);
 assert.equal(state.writes.length,0);
}
for(const badActor of [{role:'viewer',active:true,schoolId},{role:'super_admin',active:true},{role:'school_admin',active:true,schoolId:'school-b'}]){
 const state=mock();
 await assert.rejects(saveClassAttendance({db:{},api:state.api,actor:badActor,schoolId,entries:[entry('s1')]}),/School Admin/);
 assert.equal(state.writes.length,0);
}
for(const badEntries of [
 [entry('s1'),entry('s1')],
 [entry('s1'),{...entry('s2'),class:'8'}],
 [entry('s1'),{...entry('s2'),date:'2026-11-17'}],
 [entry('s1'),{...entry('s2'),present:'yes'}]
]){
 const state=mock();
 await assert.rejects(saveClassAttendance({db:{},api:state.api,actor,schoolId,entries:badEntries}));
 assert.equal(state.writes.length,0);
}
// The single-student save must reject session changes while fetching the roster.
for(const mutate of [
 a=>{a.active=false},
 a=>{a.role='viewer'},
 a=>{a.schoolId='school-b'},
 a=>{a.uid='other-admin'}
]){
 const changingActor={...actor,uid:'admin-a'};
 const state=mock();
 const originalGetDoc=state.api.getDoc;
 state.api.getDoc=async ref=>{const result=await originalGetDoc(ref);mutate(changingActor);return result};
 await assert.rejects(saveSchoolAttendance({db:{},api:state.api,actor:changingActor,schoolId,input:entry('s1')}),/identity changed/);
 assert.equal(state.writes.length,0,'Revoked admin must not write single attendance');
}
{
 const state=mock();
 await assert.rejects(saveSchoolAttendance({db:{},api:state.api,actor:{role:'super_admin',active:true},schoolId,input:entry('s1')}),/School Admin/);
 assert.equal(state.writes.length,0);
}
// Bulk saves must stop before a batch is created if a session changes during
// roster reads; the same rule applies after the batch has been staged.
for(const mutate of [
 a=>{a.active=false},
 a=>{a.role='viewer'},
 a=>{a.schoolId='school-b'},
 a=>{a.uid='other-admin'}
]){
 const duringRead={...actor,uid:'admin-a'};
 const state=mock();
 let batches=0;
 const originalGet=state.api.getDoc,originalBatch=state.api.writeBatch;
 state.api.getDoc=async ref=>{const result=await originalGet(ref);mutate(duringRead);return result};
 state.api.writeBatch=()=>{batches++;return originalBatch()};
 await assert.rejects(saveClassAttendance({db:{},api:state.api,actor:duringRead,schoolId,entries:[entry('s1'),entry('s2')]}),/identity changed during attendance roster verification/);
 assert.equal(batches,0);
 assert.equal(state.writes.length,0);

 const duringStage={...actor,uid:'admin-a'};
 const staged=mock();
 let committed=0;
 staged.api.writeBatch=()=>({set:()=>mutate(duringStage),commit:async()=>{committed++}});
 await assert.rejects(saveClassAttendance({db:{},api:staged.api,actor:duringStage,schoolId,entries:[entry('s1'),entry('s2')]}),/identity changed before attendance batch commit/);
 assert.equal(committed,0);
 assert.equal(staged.writes.length,0);
}
console.log('V47 attendance student roster authorization tests passed');
