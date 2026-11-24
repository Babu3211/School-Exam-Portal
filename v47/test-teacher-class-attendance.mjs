import assert from 'node:assert/strict';
import {saveTeacherClassAttendance} from './teacher-class-attendance.mjs';
const schoolId='12345678',uid='teacher-a',actor={schoolId,uid,role:'teacher',active:true};
const date='2026-11-24',rows=Array.from({length:11},(_,i)=>({studentId:'s'+i,class:'9',date,present:true}));
function fixture(){
 const docs=new Map([['teacher_assignments/'+schoolId+':'+uid+':9:attendance',{schoolId,uid,classId:'9',subjectId:'attendance',active:true}]]);
 for(const e of rows)docs.set('students/'+e.studentId,{schoolId,class:'9',active:true});
 docs.set('attendance/'+date+'_s0',{...rows[0],schoolId});
 let commits=0,writes=0,failAt=0;
 const api={doc:(_db,...p)=>p.slice(2).join('/'),runTransaction:async(_db,fn)=>{
  const staged=[];const n=++commits;if(n===failAt)throw Error('network');
  const r=await fn({get:async p=>{assert.equal(staged.length,0);return {exists:()=>docs.has(p),data:()=>docs.get(p)}},
   set:(p,d)=>staged.push([p,d]),update:(p,d)=>staged.push([p,{...docs.get(p),...d}])});
  for(const [p,d] of staged){docs.set(p,d);writes++}return r;
 }};
 return {docs,api,get writes(){return writes},get commits(){return commits},fail:n=>{failAt=n}};
}
const args=f=>({db:{},api:f.api,schoolId,actor,entries:rows,assertSession:()=>{}});
{
 const f=fixture();const r=await saveTeacherClassAttendance(args(f));assert.equal(r.saved,11);assert.equal(r.changed,10);assert.equal(f.commits,3);assert.equal(f.writes,10);
 assert.equal((await saveTeacherClassAttendance(args(f))).changed,0);assert.equal(f.writes,10);
}
{
 const f=fixture();f.fail(2);await assert.rejects(saveTeacherClassAttendance(args(f)),e=>e.name==='PartialAttendanceSaveError'&&e.saved===5&&e.remainingStudentIds.length===6);assert.equal(f.writes,4);
}
for(const change of [f=>f.docs.get('students/s2').active=false,f=>f.docs.get('teacher_assignments/'+schoolId+':'+uid+':9:attendance').active=false]){
 const f=fixture();change(f);await assert.rejects(saveTeacherClassAttendance(args(f)));assert.equal(f.writes,0);
}
const f=fixture();await assert.rejects(saveTeacherClassAttendance({...args(f),actor:{...actor,role:'viewer'}}),/Teacher/);
await assert.rejects(saveTeacherClassAttendance({...args(f),entries:[rows[0],rows[0]]}),/duplicate/);assert.equal(f.commits,0);
console.log('PASS assigned teacher selected-class attendance: bounded transactions, unchanged rows, assignment/roster rejection, partial error');
