import assert from 'node:assert/strict';
import {teacherAttendanceAssignmentId,saveAssignedTeacherAttendance} from './teacher-attendance-service.mjs';
const schoolId='school-a',uid='teacher-a',actor={role:'teacher',active:true,schoolId,uid};
const input={studentId:'s1',class:'9',date:'2026-11-18',present:true};
const key='teacher_assignments/school-a:teacher-a:9:attendance';
function mock(overrides={}){
 const records=new Map([[key,{schoolId,uid,classId:'9',subjectId:'attendance',active:true}],['students/s1',{schoolId,class:'9'}]]);
 for(const [id,value] of Object.entries(overrides))value===null?records.delete(id):records.set(id,value);
 const writes=[];
 const api={
  doc:(_db,...parts)=>parts.slice(2).join('/'),
  runTransaction:async(_db,callback)=>{
   const pending=[];
   const tx={get:async ref=>({exists:()=>records.has(ref),data:()=>records.get(ref)}),set:(ref,value)=>pending.push([ref,value])};
   const result=await callback(tx);
   for(const [ref,value] of pending){writes.push([ref,value]);records.set(ref,value);}
   return result;
  }
 };
 return {api,writes};
}
assert.equal(teacherAttendanceAssignmentId({schoolId,uid,classId:'9'}),'school-a:teacher-a:9:attendance');
{
 const {api,writes}=mock();
 const result=await saveAssignedTeacherAttendance({db:{},api,actor,schoolId,input});
 assert.equal(result.id,'2026-11-18_s1');
 assert.equal(writes.length,1);
 assert.equal(writes[0][1].schoolId,schoolId);
}
for(const [overrides,pattern] of [
 [{[key]:null},/assignment required/],
 [{[key]:{schoolId,uid,classId:'9',subjectId:'attendance',active:false}},/assignment required/],
 [{[key]:{schoolId:'school-b',uid,classId:'9',subjectId:'attendance',active:true}},/assignment required/],
 [{[key]:{schoolId,uid:'teacher-b',classId:'9',subjectId:'attendance',active:true}},/assignment required/],
 [{[key]:{schoolId,uid,classId:'8',subjectId:'attendance',active:true}},/assignment required/],
 [{[key]:{schoolId,uid,classId:'9',subjectId:'math',active:true}},/assignment required/],
 [{'students/s1':null},/Student missing/],
 [{'students/s1':{schoolId:'school-b',class:'9'}},/Student missing/],
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
 {role:'teacher',active:true,schoolId:'school-b',uid},
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
console.log('V47 assigned teacher attendance transaction tests passed');
