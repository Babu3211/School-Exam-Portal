import assert from 'node:assert/strict';
import {saveLoadedClassAttendance,PartialAttendanceSaveError} from './attendance-class-save.mjs';
const schoolId='school-a',actor={role:'school_admin',active:true,schoolId};
const entries=Array.from({length:11},(_,i)=>({studentId:'s'+i,class:'9',date:'2026-11-18',present:true}));
let commits=0,progress=[];
const api={
 doc:(_db,...parts)=>parts.join('/'),
 getDoc:async ref=>({exists:()=>true,data:()=>({schoolId,class:'9'})}),
 writeBatch:()=>({set:()=>{},commit:async()=>{commits++;if(commits===2)throw new Error('simulated second batch failure')}})
};
await assert.rejects(saveLoadedClassAttendance({db:{},api,actor,schoolId,entries,onProgress:p=>progress.push(p)}),e=>{
 assert.ok(e instanceof PartialAttendanceSaveError);
 assert.equal(e.saved,10);
 assert.equal(e.total,11);
 assert.match(e.cause.message,/simulated/);
 return true;
});
assert.equal(commits,2);
assert.equal(progress.length,1);
assert.equal(progress[0].saved,10);
assert.equal(progress[0].savedIds.length,10);
// If an admin loses permission after the first committed chunk, report exactly
// the committed count and never start a second batch.
for(const mutate of [
 a=>{a.active=false},
 a=>{a.role='viewer'},
 a=>{a.schoolId='school-b'},
 a=>{a.uid='different-admin'}
]){
 const changingActor={...actor,uid:'admin-a'};
 let completed=0,started=0;
 const racingApi={
  doc:(_db,...parts)=>parts.join('/'),
  getDoc:async()=>({exists:()=>true,data:()=>({schoolId,class:'9'})}),
  writeBatch:()=>{started++;return {set:()=>{},commit:async()=>{completed++;mutate(changingActor)}}}
 };
 await assert.rejects(
  saveLoadedClassAttendance({db:{},api:racingApi,actor:changingActor,schoolId,entries}),
  error=>{
   assert.ok(error instanceof PartialAttendanceSaveError);
   assert.equal(error.saved,10);
   assert.equal(error.total,11);
   assert.match(error.cause.message,/School Admin/);
   return true;
  }
 );
 assert.equal(started,1,'Revoked admin must not start another batch');
 assert.equal(completed,1,'Only the first attendance batch may commit');
}
console.log('V47 attendance partial-save recovery contract passed');
