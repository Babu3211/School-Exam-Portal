import assert from 'node:assert/strict';import {validateAttendance,saveSchoolAttendance} from '../v47/attendance-service.mjs';
const input={date:'2026-11-16',studentId:'student_1',class:'ECD',present:true};assert.deepEqual(validateAttendance(input),input);
for(const date of ['2026-02-30','2026-13-01','2026/11/16'])assert.throws(()=>validateAttendance({...input,date}));
assert.throws(()=>validateAttendance({...input,present:'yes'}));
let path,saved;const api={doc:(_db,...parts)=>{path=parts.join('/');return path},setDoc:async(_ref,data)=>{saved=data}};
const actor={role:'school_admin',active:true,schoolId:'school_001'};
const result=await saveSchoolAttendance({db:{},api,actor,schoolId:'school_001',input});assert.equal(result.id,'2026-11-16_student_1');assert.equal(path,'schools/school_001/attendance/2026-11-16_student_1');assert.deepEqual(saved,input);
for(const role of ['teacher','viewer'])await assert.rejects(()=>saveSchoolAttendance({db:{},api,actor:{...actor,role},schoolId:'school_001',input}));
await assert.rejects(()=>saveSchoolAttendance({db:{},api,actor,schoolId:'school_002',input}));console.log('V47 attendance service tests passed');
