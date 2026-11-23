import assert from 'node:assert/strict';
import {teacherAttendanceAssignmentId,saveAssignedTeacherAttendance} from './teacher-attendance-service.mjs';
const schoolId='12345678',uid='teacher-a',actor={role:'teacher',active:true,schoolId,uid};
const input={studentId:'s1',class:'9',date:'2026-11-18',present:true};
const key='teacher_assignments/12345678:teacher-a:9:attendance';
function mock(overrides={}){
 const records=new Map([[key,{schoolId,uid,classId:'9',subjectId:'attendance',active:true}],['students/s1',{schoolId,class:'9'}]]);
 for(const [id,value] of Object.entries(overrides))value===null?records.delete(id):records.set(id,value);
 const writes=[];
 const api={
  doc:(_db,...parts)=>parts.slice(2).join('/'),
  runTransaction:async(_db,callback)=>{
   const pending=[];
   const tx={
    get:async ref=>({exists:()=>records.has(ref),data:()=>records.get(ref)}),
    set:(ref,value)=>pending.push([ref,value]),
    update:(ref,patch)=>{if(!records.has(ref))throw Error('Cannot update nonexistent attendance');pending.push([ref,{...records.get(ref),...patch}])}
   };
   const result=await callback(tx);
   for(const [ref,value] of pending){writes.push([ref,value]);records.set(ref,value);}
   return result;
  }
 };
 return {api,writes};
}
assert.equal(teacherAttendanceAssignmentId({schoolId,uid,classId:'9'}),'12345678:teacher-a:9:attendance');
{
 const {api,writes}=mock();
 const result=await saveAssignedTeacherAttendance({db:{},api,actor,schoolId,input});
 assert.equal(result.id,'2026-11-18_s1');
 assert.equal(result.corrected,false);
 assert.equal(writes.length,1);
 assert.equal(writes[0][1].schoolId,schoolId);
}
// Assigned teachers can now correct ONLY an existing attendance presence.
// There is no permission to change its student, class, date, school or format.
{
 const key='attendance/2026-11-18_s1';
 const prior={schoolId,studentId:'s1',class:'9',date:'2026-11-18',present:false};
 const {api,writes}=mock({[key]:prior});
 const result=await saveAssignedTeacherAttendance({db:{},api,actor,schoolId,input});
 assert.equal(result.present,true);
 assert.equal(result.corrected,true);
 assert.equal(writes.length,1);
 assert.equal(writes[0][0],key);
 assert.deepEqual(writes[0][1],{...prior,present:true});
}
for(const invalid of [
 {schoolId:'87654321',studentId:'s1',class:'9',date:'2026-11-18',present:false},
 {schoolId,studentId:'s2',class:'9',date:'2026-11-18',present:false},
 {schoolId,studentId:'s1',class:'8',date:'2026-11-18',present:false},
 {schoolId,studentId:'s1',class:'9',date:'2026-11-19',present:false},
 {schoolId,studentId:'s1',class:'9',date:'2026-11-18',present:false,official:true}
]){
 const {api,writes}=mock({'attendance/2026-11-18_s1':invalid});
 await assert.rejects(saveAssignedTeacherAttendance({db:{},api,actor,schoolId,input}),/identity or format mismatch/);
 assert.equal(writes.length,0);
}
{
 let uid=actor.uid,reads=0;
 const {api,writes}=mock({'attendance/2026-11-18_s1':{
  schoolId,studentId:'s1',class:'9',date:'2026-11-18',present:false
 }});
 const before=api.runTransaction;
 api.runTransaction=(db,cb)=>before(db,async tx=>{
  const original=tx.get;tx.get=async ref=>{const n=++reads;const result=await original(ref);if(n===1)uid='different-account';return result};
  return cb(tx);
 });
 await assert.rejects(saveAssignedTeacherAttendance({
  db:{},api,actor,schoolId,input,assertSession:()=>{if(uid!==actor.uid)throw Error('Firebase account changed')}
 }),/Firebase account changed/);
 assert.equal(writes.length,0);
}
await assert.rejects(saveAssignedTeacherAttendance({db:{},api:mock().api,actor,schoolId,input,assertSession:true}),/Live teacher session verifier/);

for(const [overrides,pattern] of [
 [{[key]:null},/assignment required/],
 [{[key]:{schoolId,uid,classId:'9',subjectId:'attendance',active:false}},/assignment required/],
 [{[key]:{schoolId:'87654321',uid,classId:'9',subjectId:'attendance',active:true}},/assignment required/],
 [{[key]:{schoolId,uid:'teacher-b',classId:'9',subjectId:'attendance',active:true}},/assignment required/],
 [{[key]:{schoolId,uid,classId:'8',subjectId:'attendance',active:true}},/assignment required/],
 [{[key]:{schoolId,uid,classId:'9',subjectId:'math',active:true}},/assignment required/],
 [{'students/s1':null},/Student missing/],
 [{'students/s1':{schoolId:'87654321',class:'9'}},/Student missing/],
 [{'students/s1':{schoolId,class:'8'}},/Student missing/],
 [{'attendance/2026-11-18_s1':{schoolId}},/Existing attendance/]
 ]){
 const {api,writes}=mock(overrides);
 await assert.rejects(saveAssignedTeacherAttendance({db:{},api,actor,schoolId,input}),pattern);
 assert.equal(writes.length,0);
}
for(const badActor of [
 {role:'viewer',active:true,schoolId,uid},
 {role:'teacher',active:false,schoolId,uid},
 {role:'teacher',active:true,schoolId:'87654321',uid},
 {role:'teacher',active:true,schoolId,uid:'../bad'},
 {role:'teacher',active:true,schoolId}
 ]){
 const {api,writes}=mock();
 await assert.rejects(saveAssignedTeacherAttendance({db:{},api,actor:badActor,schoolId,input}),/Active assigned teacher/);
 assert.equal(writes.length,0);
}
for(const badInput of [
 {...input,studentId:'../bad'},
 {...input,class:'99'},
 {...input,date:'2026-02-30'},
 {...input,present:'yes'}
 ]){
 const {api,writes}=mock();
 await assert.rejects(saveAssignedTeacherAttendance({db:{},api,actor,schoolId,input:badInput}));
 assert.equal(writes.length,0);
}
for(const badId of ['../bad','', 'x'.repeat(129)]){
 assert.throws(()=>teacherAttendanceAssignmentId({schoolId,uid:badId,classId:'9'}),/Invalid teacher UID/);
}
assert.throws(()=>teacherAttendanceAssignmentId({schoolId,uid,classId:'99'}),/Invalid class/);
assert.throws(()=>teacherAttendanceAssignmentId({schoolId:'../bad',uid,classId:'9'}),/IEMIS number/);
// Session changes after Firestore reads must never write attendance.
for(const mutate of [
 a=>{a.active=false},
 a=>{a.role='viewer'},
 a=>{a.schoolId='87654321'},
 a=>{a.uid='another-teacher'}
]){
 const changingActor={...actor};
 const {api,writes}=mock();
 const original=api.runTransaction;
 api.runTransaction=(db,callback)=>original(db,async tx=>{
  const get=tx.get;
  let changed=false;
  tx.get=async ref=>{
   const result=await get(ref);
   if(!changed){changed=true;mutate(changingActor)}
   return result;
  };
  return callback(tx);
 });
 await assert.rejects(saveAssignedTeacherAttendance({db:{},api,actor:changingActor,schoolId,input}),/Teacher identity changed|assignment required/);
 assert.equal(writes.length,0,'Revoked teacher must not write attendance');
}
console.log('V47 assigned teacher attendance transaction tests passed');
