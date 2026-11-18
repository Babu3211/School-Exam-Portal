import assert from 'node:assert/strict';
import {createSchoolSubject} from './subject-create-service.mjs';
import {createSchoolMarkOnly} from './mark-create-service.mjs';
const actor={role:'school_admin',active:true,schoolId:'school_A'};
const writes=[];
const api={
 doc:(_db,...segments)=>segments.join('/'),
 runTransaction:async(_db,fn)=>fn({
  get:async path=>({exists:()=>!path.endsWith('/subjects/science_9')&&!path.endsWith('/marks/student_1_science_9_1st')&&!path.includes('/component_marks/'),data:()=>path.includes('/students/')?{class:'9'}:path.includes('/subject_assignments/')?{studentId:'student_1',subjectId:'science_9',class:'9'}:{active:true,class:'9',name:'Science'}}),
  set:(path,data)=>writes.push({path,data})
 })
};
const subject=await createSchoolSubject({db:{},api,actor,schoolId:'school_A',input:{id:'science_9',name:'Science',class:'9'}});
assert.equal(subject.id,'science_9');
assert.equal(writes.at(-1).data.schoolId,'school_A');
await assert.rejects(()=>createSchoolSubject({db:{},api,actor,schoolId:'school_B',input:{id:'science_9',name:'Science',class:'9'}}),/permission/i);
console.log('V47 tenant subject write service check passed');
