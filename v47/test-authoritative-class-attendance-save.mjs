import assert from 'node:assert/strict';
import {saveAuthoritativeClassAttendance} from './verified-class-attendance-save.mjs';
const schoolId='12345678',classId='9',date='2026-11-18';
const actor={uid:'admin-1',active:true,role:'school_admin',schoolId};
const students=['s1','s2'];
let committed=0,staged=[];
const api={
 collection:(_db,...parts)=>parts.join('/'),
 query:(...args)=>args,
 where:(...args)=>args,
 orderBy:(...args)=>args,
 limit:(...args)=>args,
 startAfter:(...args)=>args,
 getDocs:async()=>({docs:students.map(id=>({id,data:()=>({schoolId,class:classId})})),size:2,empty:false}),
 doc:(_db,...parts)=>parts.join('/'),
 getDoc:async()=>({exists:()=>true,data:()=>({schoolId,class:classId})}),
 writeBatch:()=>({set:(ref,val)=>staged.push([ref,val]),commit:async()=>{committed++}})
};
const entries=students.map(studentId=>({studentId,class:classId,date,present:true}));
await assert.rejects(saveAuthoritativeClassAttendance({db:{},api,actor,schoolId,classId,date,entries:entries.slice(0,1)}),/incomplete|roster|missing/i);
assert.equal(committed,0,'Incomplete selection must not commit');
const success=await saveAuthoritativeClassAttendance({db:{},api,actor,schoolId,classId,date,entries});
assert.equal(success.saved,2);
assert.equal(committed,1,'Complete class must commit in one batch for <=10 students');
assert.equal(staged.length,2);
assert.ok(staged.every(([,value])=>value.schoolId===schoolId));
const otherSchool={...actor,schoolId:'87654321'};
await assert.rejects(saveAuthoritativeClassAttendance({db:{},api,actor:otherSchool,schoolId,classId,date,entries}),/School Admin|School membership|permission/i);
assert.equal(committed,1,'Cross-school identity must never commit');
let reads=0;
const guardedApi={...api,getDocs:async(...args)=>{reads++;return api.getDocs(...args)}};
for(const forbidden of [{...actor,role:'viewer'},{...actor,role:'teacher'},{...actor,active:false},{...actor,uid:''}]){
 await assert.rejects(saveAuthoritativeClassAttendance({db:{},api:guardedApi,actor:forbidden,schoolId,classId,date,entries}),/School Admin permission required/);
}
assert.equal(reads,0,'Unauthorized actors must not read the authoritative roster');
let checks=0;
await saveAuthoritativeClassAttendance({db:{},api,actor,schoolId,classId,date,entries,assertSession:()=>{checks++}});
assert.ok(checks>=3,'Live session must be checked before roster, after roster and before save');
await assert.rejects(saveAuthoritativeClassAttendance({db:{},api,actor,schoolId,classId,date,entries,assertSession:true}),/Attendance session verifier required/);
let rosterReads=0;
await assert.rejects(saveAuthoritativeClassAttendance({db:{},api:{...api,getDocs:async()=>{rosterReads++;return api.getDocs()}},actor,schoolId,classId,date,entries,assertSession:()=>{throw new Error('Firebase account switched')}}),/Firebase account switched/);
assert.equal(rosterReads,0,'Switched account must not read roster');

/* A verified roster of 11 is not atomic: if batch two fails, only the first
 * ten may be reported as confirmed. Never silently treat this as success. */
{
 const elevenIds=Array.from({length:11},(_,i)=>'s'+String(i).padStart(3,'0'));
 let attempts=0,complete=0;
 const progress=[];
 const extendedApi={...api,
  getDocs:async()=>({docs:elevenIds.map(id=>({id,data:()=>({schoolId,class:classId})}))}),
  writeBatch:()=>({set:()=>{},commit:async()=>{attempts++;if(attempts===2)throw new Error('second attendance batch unavailable');complete++}})
 };
 await assert.rejects(saveAuthoritativeClassAttendance({
  db:{},api:extendedApi,actor,schoolId,classId,date,
  entries:elevenIds.map(studentId=>({studentId,class:classId,date,present:false})),
  onProgress:p=>progress.push(p)
 }),e=>{
  assert.equal(e.name,'PartialAttendanceSaveError');
  assert.equal(e.saved,10);
  assert.equal(e.total,11);
  assert.deepEqual(e.remainingStudentIds,['s010']);
  assert.match(e.cause?.message??'',/second attendance batch unavailable/);
  return true;
 });
 assert.equal(attempts,2);
 assert.equal(complete,1);
 assert.equal(progress.length,1);
 assert.equal(progress[0].saved,10);
}

console.log('Authoritative attendance: complete roster, permissions, live session and partial-batch failure verified');
