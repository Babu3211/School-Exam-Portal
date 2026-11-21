import assert from 'node:assert/strict';
import {verifyTeacherAttendanceDuty} from './verified-teacher-attendance-duty.mjs';
const actor={uid:'teacher1',role:'teacher',active:true,schoolId:'12345'};
const valid={schoolId:'12345',uid:'teacher1',classId:'9',subjectId:'attendance',active:true};
let record=valid,exists=true,revalidations=0,reads=0;
const api={doc:(_db,...parts)=>parts.join('/'),getDoc:async path=>{reads++;assert.equal(path,'schools/12345/teacher_assignments/12345:teacher1:9:attendance');return {exists:()=>exists,data:()=>record}}};
const base={db:{},api,actor,schoolId:'12345',classId:'9',revalidate:async()=>{revalidations++}};
const result=await verifyTeacherAttendanceDuty(base);
assert.equal(result.verified,true);assert.equal(result.writeAuthorized,false);
assert.equal(reads,1);assert.equal(revalidations,2);
exists=false;await assert.rejects(()=>verifyTeacherAttendanceDuty(base),/No verified attendance duty/);exists=true;
for(const changed of [{...valid,active:false},{...valid,schoolId:'54321'},{...valid,uid:'other'},{...valid,classId:'10'},{...valid,subjectId:'math'}]){
 record=changed;await assert.rejects(()=>verifyTeacherAttendanceDuty(base),/inactive or mismatched/);
}
record=valid;
for(const bad of [{...actor,active:false},{...actor,role:'viewer'},{...actor,schoolId:'54321'}])await assert.rejects(()=>verifyTeacherAttendanceDuty({...base,actor:bad}),/Active school teacher/);
await assert.rejects(()=>verifyTeacherAttendanceDuty({...base,classId:'13'}),/Invalid attendance class/);
await assert.rejects(()=>verifyTeacherAttendanceDuty({...base,schoolId:'invalid'}));
await assert.rejects(()=>verifyTeacherAttendanceDuty({...base,revalidate:async()=>{throw new Error('revoked')}}),/revoked/);
const changed={...actor};await assert.rejects(()=>verifyTeacherAttendanceDuty({...base,actor:changed,revalidate:async()=>{changed.active=false}}),/Teacher session changed/);
console.log('V47 attendance duty verifier denies missing, inactive and cross-school duties');
