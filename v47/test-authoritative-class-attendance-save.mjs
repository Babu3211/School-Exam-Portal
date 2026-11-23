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
// A withdrawn student left in a class collection must be excluded before
// the FIRST attendance write; legacy records without active stay eligible.
{
 const all=[
  ['s1',{schoolId,class:classId,active:false}],
  ['s2',{schoolId,class:classId}],
  ['s3',{schoolId,class:classId,active:true}]
 ];
 let writes=0;
 const mixedApi={...api,
  getDocs:async()=>({docs:all.map(([id,data])=>({id,data:()=>data}))}),
  getDoc:async ref=>{
   const row=all.find(([id])=>ref.endsWith('/'+id));
   return {exists:()=>!!row,data:()=>row?.[1]};
  },
  writeBatch:()=>({set:()=>{},commit:async()=>{writes++}})
 };
 const activeEntries=['s2','s3'].map(studentId=>({studentId,class:classId,date,present:true}));
 await assert.rejects(saveAuthoritativeClassAttendance({
  db:{},api:mixedApi,actor,schoolId,classId,date,
  entries:all.map(([studentId])=>({studentId,class:classId,date,present:true}))
 }),/not in selected class|incomplete/);
 assert.equal(writes,0,'A stale UI selection containing inactive student must not write');
 const approved=await saveAuthoritativeClassAttendance({
  db:{},api:mixedApi,actor,schoolId,classId,date,entries:activeEntries
 });
 assert.equal(approved.saved,2);
 assert.equal(writes,1);
 assert.equal(approved.rosterReverified,true);
}
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

// Successful saves require a second, authoritative class roster read.
{
 let reads=0,writes=0;
 const sameApi={...api,
  getDocs:async()=>{reads++;return api.getDocs()},
  writeBatch:()=>({set:()=>{},commit:async()=>{writes++}})
 };
 const result=await saveAuthoritativeClassAttendance({db:{},api:sameApi,actor,schoolId,classId,date,entries});
 assert.equal(result.rosterReverified,true);
 assert.equal(writes,1);
 assert.equal(reads,2,'Read entire class both before and after acknowledged writes');
}
// Student enrolled or transferred after first roster verification. The write
// succeeded, but full-class completion must NEVER be claimed.
for(const changedIds of [['s1','s2','s3'],['s2']]){
 let reads=0,commits=0;
 const changingApi={...api,
  getDocs:async()=>{
   reads++;
   const ids=reads===1?students:changedIds;
   return {docs:ids.map(id=>({id,data:()=>({schoolId,class:classId})}))};
  },
  writeBatch:()=>({set:()=>{},commit:async()=>{commits++}})
 };
 await assert.rejects(saveAuthoritativeClassAttendance({db:{},api:changingApi,actor,schoolId,classId,date,entries}),error=>{
  assert.equal(error.name,'AttendancePostSaveReviewError');
  assert.equal(error.saved,2);
  assert.equal(error.total,2);
  assert.equal(error.reviewRequired,true);
  assert.match(error.cause?.message??'',/roster changed/);
  return true;
 });
 assert.equal(commits,1,'Confirmed writes must not be reported as rolled back');
 assert.equal(reads,2);
}
// Field ordering is not a semantic enrollment change. Avoid false REVIEW
// after a successful write when Firestore returns equivalent data with a
// different property insertion order.
{
 let reads=0,commits=0;
 const sameValues={schoolId,class:classId,name:'Student'};
 const reorderedApi={...api,
  getDocs:async()=>{
   reads++;
   const reordered=reads===1?sameValues:{name:'Student',class:classId,schoolId};
   return {docs:students.map(id=>({id,data:()=>({...reordered})}))};
  },
  writeBatch:()=>({set:()=>{},commit:async()=>{commits++}})
 };
 const result=await saveAuthoritativeClassAttendance({
  db:{},api:reorderedApi,actor,schoolId,classId,date,entries
 });
 assert.equal(result.rosterReverified,true);
 assert.equal(reads,2);
 assert.equal(commits,1);
}
// A student record changing while attendance is being committed must
// invalidate full-class verification even if every student ID stays the same.
for(const change of [
 student=>{student.name='Changed during save'},
 student=>{student.active=false}
]){
 let reads=0,commits=0;
 const rosterData=students.map(id=>({schoolId,class:classId,name:id,active:true}));
 const changingApi={...api,
  getDocs:async()=>{
   reads++;
   if(reads===2)change(rosterData[0]);
   return {docs:students.map((id,index)=>({
    id,data:()=>structuredClone(rosterData[index])
   }))};
  },
  writeBatch:()=>({set:()=>{},commit:async()=>{commits++}})
 };
 await assert.rejects(saveAuthoritativeClassAttendance({
  db:{},api:changingApi,actor,schoolId,classId,date,entries
 }),error=>{
  assert.equal(error.name,'AttendancePostSaveReviewError');
  assert.equal(error.saved,2);
  assert.equal(error.reviewRequired,true);
  assert.match(error.cause?.message??'',/roster changed/);
  return true;
 });
 assert.equal(commits,1,'Acknowledged attendance must not be reported as rolled back');
 assert.equal(reads,2);
}
// The last roster read may fail after the last batch succeeds. This requires
// explicit human review; it must not silently become a success or a retry.
{
 let reads=0,commits=0;
 const offlineApi={...api,
  getDocs:async()=>{reads++;if(reads===2)throw Error('final roster offline');return api.getDocs()},
  writeBatch:()=>({set:()=>{},commit:async()=>{commits++}})
 };
 await assert.rejects(saveAuthoritativeClassAttendance({db:{},api:offlineApi,actor,schoolId,classId,date,entries}),e=>{
  assert.equal(e.name,'AttendancePostSaveReviewError');
  assert.equal(e.saved,2);
  assert.match(e.cause?.message??'',/final roster offline/);
  return true;
 });
 assert.equal(commits,1);
}
// A session switch after the successful commit but before final verification
// also demands manual review and must never claim the batch was rolled back.
{
 let checks=0,commits=0;
 const changedAuthApi={...api,writeBatch:()=>({set:()=>{},commit:async()=>{commits++}})};
 await assert.rejects(saveAuthoritativeClassAttendance({db:{},api:changedAuthApi,actor,schoolId,classId,date,entries,
  assertSession:()=>{checks++;if(checks>=4)throw Error('Firebase user switched after commit')}
 }),e=>{
  assert.equal(e.name,'AttendancePostSaveReviewError');
  assert.equal(e.saved,2);
  assert.match(e.cause?.message??'',/user switched after commit/);
  return true;
 });
 assert.equal(commits,1);
}

// Exercise real paginated authoritative reads for the 1,500-student limit,
// not a mocked "one page contains every student" shortcut.
{
 const roster=Array.from({length:1500},(_,i)=>'s'+String(i+1).padStart(4,'0'));
 const entries=roster.map(studentId=>({studentId,class:classId,date,present:true}));
 const fixture=()=>({
  ...api,
  limit:n=>({kind:'limit',n}),
  startAfter:id=>({kind:'after',id}),
  query:(...args)=>args,
  getDocs:async query=>{
   const after=query.find(x=>x?.kind==='after')?.id;
   const limit=query.find(x=>x?.kind==='limit')?.n??101;
   const start=after?roster.indexOf(after)+1:0;
   if(after&&start===0)throw Error('Unknown roster cursor');
   return {docs:roster.slice(start,start+limit).map(id=>({
    id,data:()=>({schoolId,class:classId})
   }))};
  }
 });
 let pages=0,commits=0,records=0;
 const largeApi=fixture(),original=largeApi.getDocs;
 largeApi.getDocs=async query=>{pages++;return original(query)};
 largeApi.writeBatch=()=>{let staged=0;return {set:()=>{staged++},commit:async()=>{commits++;records+=staged}}};
 const result=await saveAuthoritativeClassAttendance({
  db:{},api:largeApi,actor,schoolId,classId,date,entries
 });
 assert.equal(result.saved,1500);
 assert.equal(result.rosterReverified,true);
 assert.equal(records,1500);
 assert.equal(commits,150,'Existing safe chunk-of-10 commits must not be silently replaced');
 assert.equal(pages,30,'15 ordered pages before and 15 ordered pages after the save');
}
// A student enrolled during the 150th commit must cause an explicit REVIEW
// outcome, even though all 1500 original writes were acknowledged.
{
 const originalIds=Array.from({length:1500},(_,i)=>'s'+String(i+1).padStart(4,'0'));
 let ids=originalIds,commits=0;
 const largeApi={...api,
  limit:n=>({kind:'limit',n}),
  startAfter:id=>({kind:'after',id}),
  query:(...args)=>args,
  getDocs:async query=>{
   const after=query.find(x=>x?.kind==='after')?.id;
   const size=query.find(x=>x?.kind==='limit')?.n??101;
   const from=after?ids.indexOf(after)+1:0;
   return {docs:ids.slice(from,from+size).map(id=>({id,data:()=>({schoolId,class:classId})}))};
  },
  writeBatch:()=>({set:()=>{},commit:async()=>{
   commits++;
   if(commits===150)ids=[...originalIds,'s1501'];
  }})
 };
 await assert.rejects(saveAuthoritativeClassAttendance({
  db:{},api:largeApi,actor,schoolId,classId,date,
  entries:originalIds.map(studentId=>({studentId,class:classId,date,present:false}))
 }),err=>{
  assert.equal(err.name,'AttendancePostSaveReviewError');
  assert.equal(err.saved,1500);
  assert.equal(err.reviewRequired,true);
  assert.match(err.cause?.message??'',/exceeds 1500/);
  return true;
 });
 assert.equal(commits,150);
}
console.log('Authoritative attendance: complete roster, permissions, live session and partial-batch failure verified');
