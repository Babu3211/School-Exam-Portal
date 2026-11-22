import assert from 'node:assert/strict';
import {saveLoadedClassAttendance,PartialAttendanceSaveError} from './attendance-class-save.mjs';
const schoolId='12345678',actor={uid:'admin-a',role:'school_admin',active:true,schoolId};
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
 assert.deepEqual(e.remainingStudentIds,['s10']);
 assert.ok(Object.isFrozen(e.remainingStudentIds));
 assert.match(e.cause.message,/simulated/);
 return true;
});
assert.equal(commits,2);
assert.equal(progress.length,1);
assert.equal(progress[0].saved,10);
assert.equal(progress[0].savedIds.length,10);

// A failure before the first successful batch must still identify every
// pending student, rather than falling back to a generic error.
{
 const firstBatchApi={
  doc:(_db,...parts)=>parts.join('/'),
  getDoc:async()=>({exists:()=>true,data:()=>({schoolId,class:'9'})}),
  writeBatch:()=>({set:()=>{},commit:async()=>{throw new Error('first batch offline')}})
 };
 await assert.rejects(saveLoadedClassAttendance({
  db:{},api:firstBatchApi,actor:{...actor,uid:'admin-a'},schoolId,entries
 }),error=>{
  assert.ok(error instanceof PartialAttendanceSaveError);
  assert.equal(error.saved,0);
  assert.equal(error.total,11);
  assert.deepEqual(error.remainingStudentIds,entries.map(e=>e.studentId));
  assert.match(error.cause.message,/first batch offline/);
  return true;
 });
}
// If an admin loses permission after the first committed chunk, report exactly
// the committed count and never start a second batch.
for(const mutate of [
 a=>{a.active=false},
 a=>{a.role='viewer'},
 a=>{a.schoolId='87654321'},
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
   assert.deepEqual(error.remainingStudentIds,['s10']);
   assert.match(error.cause.message,/School Admin/);
   return true;
  }
 );
 assert.equal(started,1,'Revoked admin must not start another batch');
 assert.equal(completed,1,'Only the first attendance batch may commit');
}
// Progress callbacks run between batches. A UI session switch must not let
// the remaining students be saved under a different admin identity.
for(const mutate of [
 a=>{a.active=false},
 a=>{a.role='viewer'},
 a=>{a.schoolId='87654321'},
 a=>{a.uid='switched-admin'}
]){
 const changingActor={...actor,uid:'admin-a'};
 let commitsAfterProgress=0,progressCalls=0;
 const progressApi={
  doc:(_db,...parts)=>parts.join('/'),
  getDoc:async()=>({exists:()=>true,data:()=>({schoolId,class:'9'})}),
  writeBatch:()=>({set:()=>{},commit:async()=>{commitsAfterProgress++}})
 };
 await assert.rejects(
  saveLoadedClassAttendance({
   db:{},api:progressApi,actor:changingActor,schoolId,entries,
   onProgress:()=>{progressCalls++;mutate(changingActor)}
  }),
  error=>{
   assert.ok(error instanceof PartialAttendanceSaveError);
   assert.equal(error.saved,10);
   assert.equal(error.total,11);
   assert.deepEqual(error.remainingStudentIds,['s10']);
   assert.match(error.cause.message,/identity changed/);
   return true;
  }
 );
 assert.equal(progressCalls,1);
 assert.equal(commitsAfterProgress,1,'No second commit after progress callback switches session');
}
// Maximum supported class size must be split into exactly 150 batches of
// 10, with accurate progress and no silent omissions.
{
 const largeEntries=Array.from({length:1500},(_,i)=>({studentId:'s'+i,class:'9',date:'2026-11-18',present:i%2===0}));
 let batches=0,staged=0,lastProgress;
 const largeApi={
  doc:(_db,...parts)=>parts.join('/'),
  getDoc:async()=>({exists:()=>true,data:()=>({schoolId,class:'9'})}),
  writeBatch:()=>{batches++;let pending=0;return {
   set:()=>{pending++},
   commit:async()=>{assert.equal(pending,10);staged+=pending}
  }}
 };
 const result=await saveLoadedClassAttendance({
  db:{},api:largeApi,actor:{...actor,uid:'admin-a'},schoolId,entries:largeEntries,
  onProgress:p=>{lastProgress=p}
 });
 assert.equal(result.saved,1500);
 assert.equal(result.total,1500);
 assert.equal(batches,150);
 assert.equal(staged,1500);
 assert.equal(lastProgress.saved,1500);
 assert.equal(lastProgress.savedIds.length,10);
}
// A failed batch at scale must report only confirmed commits, not attempted
// writes or students in the failed batch.
{
 const largeEntries=Array.from({length:1500},(_,i)=>({studentId:'s'+i,class:'9',date:'2026-11-18',present:true}));
 let attempts=0;
 const largeApi={
  doc:(_db,...parts)=>parts.join('/'),
  getDoc:async()=>({exists:()=>true,data:()=>({schoolId,class:'9'})}),
  writeBatch:()=>({set:()=>{},commit:async()=>{attempts++;if(attempts===75)throw new Error('simulated batch 75 failure')}})
 };
 await assert.rejects(saveLoadedClassAttendance({
  db:{},api:largeApi,actor:{...actor,uid:'admin-a'},schoolId,entries:largeEntries
 }),error=>{
  assert.ok(error instanceof PartialAttendanceSaveError);
  assert.equal(error.saved,740);
  assert.equal(error.total,1500);
  assert.equal(error.remainingStudentIds.length,760);
  assert.equal(error.remainingStudentIds[0],'s740');
  assert.equal(error.remainingStudentIds.at(-1),'s1499');
  assert.match(error.cause.message,/batch 75 failure/);
  return true;
 });
 assert.equal(attempts,75);
}
// At scale, a revoked school admin after the 74th committed batch must
// prevent batch 75 from starting, preserving the exact 740 saved count.
{
 const largeEntries=Array.from({length:1500},(_,i)=>({studentId:'s'+i,class:'9',date:'2026-11-18',present:true}));
 const changingActor={...actor,uid:'admin-a'};
 let batchesStarted=0,commitsDone=0;
 const revokingApi={
  doc:(_db,...parts)=>parts.join('/'),
  getDoc:async()=>({exists:()=>true,data:()=>({schoolId,class:'9'})}),
  writeBatch:()=>{batchesStarted++;return {
   set:()=>{},
   commit:async()=>{commitsDone++;if(commitsDone===74)changingActor.active=false}
  }}
 };
 await assert.rejects(saveLoadedClassAttendance({
  db:{},api:revokingApi,actor:changingActor,schoolId,entries:largeEntries
 }),error=>{
  assert.ok(error instanceof PartialAttendanceSaveError);
  assert.equal(error.saved,740);
  assert.equal(error.total,1500);
  assert.equal(error.remainingStudentIds.length,760);
  assert.equal(error.remainingStudentIds[0],'s740');
  assert.equal(error.remainingStudentIds.at(-1),'s1499');
  assert.match(error.cause.message,/School Admin/);
  return true;
 });
 assert.equal(batchesStarted,74,'Revoked admin must not start batch 75');
 assert.equal(commitsDone,74);
}

// UI must keep already-saved selections out of a retry and give Nepali
// guidance for remaining students. This is a static UI contract, not a browser test.
{
 const {readFileSync}=await import('node:fs');
 const ui=readFileSync(new URL('./attendance-console.mjs',import.meta.url),'utf8');
 assert.match(ui,/for\(const id of savedIds\)rosterSelections\.delete\(id\)/);
 assert.match(ui,/e\?\.name==='PartialAttendanceSaveError'/);
 assert.match(ui,/e\.remainingStudentIds\.length/);
 assert.match(ui,/Attendance Save असफल/);
 assert.match(ui,/नेटवर्क त्रुटि हुँदा Save भइसकेको पनि हुन सक्छ/);
 assert.match(ui,/पुनः प्रयास गर्नुअघि Attendance सूची Reload गरी जाँच्नुहोस्/);
 assert.match(ui,/if\(attendanceReviewRequired\)/);
 assert.match(ui,/if\(attendanceReviewRequired\)throw new Error\('अघिल्लो Bulk Save/);
 assert.match(ui,/\$\('bulkSave'\)\.onclick=async\(\)=>\{if\(savingAttendance\)return;savingAttendance=true/);
 assert.match(ui,/const button=\$\('bulkSave'\);button\.disabled=true;\$\('logout'\)\.disabled=true;\$\('login'\)\.disabled=true;\$\('save'\)\.disabled=true/);
 assert.match(ui,/if\(review\)\{if\(result\.hasMore\)/);
 assert.match(ui,/attendanceReviewRequired=false/);
 assert.match(ui,/attendanceReviewRequired&&attendanceReviewInProgress&&!result\.hasMore&&records\.length>0/);
 assert.match(ui,/if\(review\)\{attendanceReviewInProgress=true/);
 assert.match(ui,/function reset\(\)\{attendanceReviewInProgress=false/);
 assert.match(ui,/load\(true,true\)/);
 assert.match(ui,/\$\('schoolClass'\)\.disabled=attendanceReviewRequired/);
 assert.match(ui,/\$\('date'\)\.disabled=attendanceReviewRequired/);
 assert.match(ui,/if\(e\?\.name==='PartialAttendanceSaveError'\)attendanceReviewRequired=true/);
}
console.log('V47 attendance partial-save recovery contract passed');
