import assert from 'node:assert/strict';
import {createSchoolSubject} from './subject-create-service.mjs';
import {createSchoolMarkOnly} from './mark-create-service.mjs';
const actor={role:'school_admin',active:true,schoolId:'school_A'};
const writes=[];
const api={
 doc:(_db,...segments)=>segments.join('/'),
 runTransaction:async(_db,fn)=>fn({
  get:async path=>({exists:()=>!path.endsWith('/subjects/science_9')&&!path.includes('/marks/')&&!path.includes('/component_marks/'),data:()=>path.includes('/students/')?{class:'9'}:path.includes('/subject_assignments/')?{studentId:'student_1',subjectId:'science_9',class:'9'}:{active:true,class:'9',name:'Science'}}),
  set:(path,data)=>writes.push({path,data})
 })
};
const subject=await createSchoolSubject({db:{},api,actor,schoolId:'school_A',input:{id:'science_9',name:'Science',class:'9'}});
assert.equal(subject.id,'science_9');
assert.equal(writes.at(-1).data.schoolId,'school_A');
const mark=await createSchoolMarkOnly({db:{},api,actor,schoolId:'school_A',input:{studentId:'student_1',subjectId:'science_9',class:'9',term:'1st',theory:25,practical:10}});
assert.equal(mark.schoolId,undefined);
assert.equal(writes.at(-1).data.schoolId,'school_A');
assert.match(writes.at(-1).path,/schools\\/school_A\\/marks\\//);
await assert.rejects(()=>createSchoolMarkOnly({db:{},api,actor,schoolId:'school_B',input:{studentId:'student_1',subjectId:'science_9',class:'9',term:'1st',theory:25,practical:10}}),/permission/i);
await assert.rejects(()=>createSchoolSubject({db:{},api,actor,schoolId:'school_B',input:{id:'science_9',name:'Science',class:'9'}}),/permission/i);
console.log('V47 tenant subject write service check passed');
