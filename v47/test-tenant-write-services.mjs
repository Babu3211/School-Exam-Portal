import assert from 'node:assert/strict';
import {createSchoolSubject} from './subject-create-service.mjs';
import {createSchoolMarkOnly} from './mark-create-service.mjs';
import {saveSchoolAttendance} from './attendance-service.mjs';
import {saveClassAttendance} from './attendance-bulk.mjs';
const actor={role:'school_admin',active:true,schoolId:'school_A'};
const writes=[];
let subjectCreateMode=true;
let existingMark=false;
let missingAssignment=false;
const api={
 doc:(_db,...segments)=>segments.join('/'),
 runTransaction:async(_db,fn)=>fn({
  get:async path=>({exists:()=>!(subjectCreateMode&&path.endsWith('/subjects/science_9'))&&!(path.includes('/marks/')&&!existingMark)&&!path.includes('/component_marks/')&&!(missingAssignment&&path.includes('/subject_assignments/')),data:()=>path.includes('/students/')?{class:'9'}:path.includes('/subject_assignments/')?{studentId:'student_1',subjectId:'science_9',class:'9'}:{active:true,class:'9',name:'Science'}}),
  set:(path,data)=>writes.push({path,data})
 })
};
const subject=await createSchoolSubject({db:{},api,actor,schoolId:'school_A',input:{id:'science_9',name:'Science',class:'9'}});
assert.equal(subject.id,'science_9');
assert.equal(writes.at(-1).data.schoolId,'school_A');
subjectCreateMode=false;
const mark=await createSchoolMarkOnly({db:{},api,actor,schoolId:'school_A',input:{studentId:'student_1',subjectId:'science_9',class:'9',term:'1st',theory:25,practical:10}});
assert.equal(mark.schoolId,undefined);
assert.equal(writes.at(-1).data.schoolId,'school_A');
assert.ok(writes.at(-1).path.startsWith('schools/school_A/marks/'));
existingMark=true;
await assert.rejects(()=>createSchoolMarkOnly({db:{},api,actor,schoolId:'school_A',input:{studentId:'student_1',subjectId:'science_9',class:'9',term:'1st',theory:25,practical:10}}),/already exists/i);
existingMark=false;missingAssignment=true;
await assert.rejects(()=>createSchoolMarkOnly({db:{},api,actor,schoolId:'school_A',input:{studentId:'student_1',subjectId:'science_9',class:'9',term:'1st',theory:25,practical:10}}),/assignment required/i);
missingAssignment=false;
await assert.rejects(()=>createSchoolMarkOnly({db:{},api,actor:{role:'viewer',active:true,schoolId:'school_A'},schoolId:'school_A',input:{studentId:'student_1',subjectId:'science_9',class:'9',term:'1st',theory:25,practical:10}}),/permission/i);
await assert.rejects(()=>createSchoolMarkOnly({db:{},api,actor,schoolId:'school_B',input:{studentId:'student_1',subjectId:'science_9',class:'9',term:'1st',theory:25,practical:10}}),/permission/i);
await assert.rejects(()=>createSchoolSubject({db:{},api,actor,schoolId:'school_B',input:{id:'science_9',name:'Science',class:'9'}}),/permission/i);
const attendanceWrites=[];
const attendanceApi={
 doc:(_db,...parts)=>parts.join('/'),
 setDoc:async(path,data)=>{attendanceWrites.push({path,data})},
 writeBatch:()=>({set:(path,data)=>attendanceWrites.push({path,data}),commit:async()=>{}})
};
const attendanceInput={date:'2026-11-18',studentId:'student_1',class:'9',present:true};
await saveSchoolAttendance({db:{},api:attendanceApi,actor,schoolId:'school_A',input:attendanceInput});
assert.equal(attendanceWrites.at(-1).data.schoolId,'school_A');
assert.ok(attendanceWrites.at(-1).path.startsWith('schools/school_A/attendance/'));
await saveClassAttendance({db:{},api:attendanceApi,actor,schoolId:'school_A',entries:[attendanceInput]});
assert.equal(attendanceWrites.at(-1).data.schoolId,'school_A');
assert.ok(attendanceWrites.at(-1).path.startsWith('schools/school_A/attendance/'));
await assert.rejects(()=>saveClassAttendance({db:{},api:attendanceApi,actor:{role:'viewer',active:true,schoolId:'school_A'},schoolId:'school_A',entries:[attendanceInput]}),/permission/i);
console.log('V47 tenant subject, mark and attendance write service check passed');
