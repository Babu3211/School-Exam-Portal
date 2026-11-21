import assert from 'node:assert/strict';
import {saveVerifiedClassAttendance} from './verified-class-attendance-save.mjs';
const schoolId='12345678',classId='9',date='2026-11-18',actor={role:'school_admin',active:true,schoolId};
const entry=(studentId,present=true)=>({studentId,class:classId,date,present});
const args={schoolId,classId,date,actor,expectedStudentIds:['s1','s2'],entries:[entry('s1'),entry('s2',false)]};
let committed=[];
const api={doc:(_db,...parts)=>parts.join('/'),getDoc:async ref=>({exists:()=>ref.endsWith('/students/s1')||ref.endsWith('/students/s2'),data:()=>({schoolId,class:classId})}),writeBatch:()=>({
 set:(ref,value)=>committed.push([ref,value]),
 commit:async()=>{}
})};
const result=await saveVerifiedClassAttendance({...args,db:{},api});
assert.equal(result.saved,2);
assert.equal(committed.length,2);
assert.equal(committed[0][1].schoolId,schoolId);
for(const [change,pattern] of [
 [{entries:[entry('s1')]},/incomplete/],
 [{entries:[entry('s1'),entry('s1')]},/Duplicate/],
 [{entries:[entry('s1'),entry('s3')]},/not in selected/],
 [{actor:{role:'viewer',active:true,schoolId}},/School Admin/],
 [{actor:{role:'super_admin',active:true}},/School Admin/],
 [{actor:{role:'school_admin',active:true,schoolId:'87654321'}},/School Admin/]
 ]){
 committed=[];
 await assert.rejects(saveVerifiedClassAttendance({...args,...change,db:{},api}),pattern);
 assert.equal(committed.length,0);
}
// A revoked admin session while student records load must not commit a batch.
for(const mutate of [
 a=>{a.active=false},
 a=>{a.role='viewer'},
 a=>{a.schoolId='87654321'},
 a=>{a.uid='other-admin'}
]){
 const changingActor={...actor,uid:'admin-a'};
 let batchCalls=0;
 const racingApi={...api,
  getDoc:async ref=>{const result=await api.getDoc(ref);mutate(changingActor);return result},
  writeBatch:()=>{batchCalls++;return api.writeBatch()}
 };
 committed=[];
 await assert.rejects(saveVerifiedClassAttendance({...args,actor:changingActor,db:{},api:racingApi}),/identity changed/);
 assert.equal(batchCalls,0,'Revoked admin must not start attendance batch');
 assert.equal(committed.length,0,'Revoked admin must not write attendance');
}
// A session change while constructing a batch must prevent commit.
for(const mutate of [
 a=>{a.active=false},
 a=>{a.role='viewer'},
 a=>{a.schoolId='87654321'},
 a=>{a.uid='other-admin'}
]){
 const changingActor={...actor,uid:'admin-a'};
 let commitCalls=0;
 const racingApi={...api,writeBatch:()=>({
  set:()=>mutate(changingActor),
  commit:async()=>{commitCalls++}
 })};
 await assert.rejects(saveVerifiedClassAttendance({...args,actor:changingActor,db:{},api:racingApi}),/identity changed before attendance batch commit/);
 assert.equal(commitCalls,0,'Revoked admin must not commit a staged batch');
}
console.log('V47 verified attendance save contract checks passed');
