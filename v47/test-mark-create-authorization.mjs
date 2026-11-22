import assert from 'node:assert/strict';
import {createSchoolMarkOnly} from './mark-create-service.mjs';
const schoolId='12345678',classId='9',subjectId='math';
const input={studentId:'s1',subjectId,class:classId,term:'monthly',theory:25,practical:10};
function mock(overrides={}){
 const docs=new Map([
  ['students/s1',{schoolId,class:classId}],
  ['subjects/math',{schoolId,class:classId,active:true,name:'Math',theoryFullMarks:100,practicalFullMarks:100}],
  ['subject_assignments/s1:math',{schoolId,class:classId,studentId:'s1',subjectId,active:true}]
 ]);
 for(const [key,value] of Object.entries(overrides))value===null?docs.delete(key):docs.set(key,value);
 const writes=[];
 const api={
  doc:(_db,...path)=>path.slice(2).join('/'),
  runTransaction:async(_db,fn)=>{
   const pending=[];
   const tx={
    get:async ref=>({exists:()=>docs.has(ref),data:()=>docs.get(ref)}),
    set:(ref,data)=>pending.push([ref,data])
   };
   await fn(tx);
   writes.push(...pending);
  }
 };
 return {api,writes};
}
for(const actor of [
 {role:'super_admin',active:true},
 {role:'viewer',active:true,schoolId},
 {role:'school_admin',active:false,schoolId},
 {role:'school_admin',active:true,schoolId:'87654321'},
 {role:'teacher',active:true,schoolId,uid:'teacher-1'}
]){
 const {api,writes}=mock();
 await assert.rejects(createSchoolMarkOnly({db:{},api,actor,schoolId,input}),/permission|assignment/i);
 assert.equal(writes.length,0,'Unauthorized actor must not write');
}
{
 const {api,writes}=mock();
 const result=await createSchoolMarkOnly({db:{},api,actor:{role:'school_admin',active:true,schoolId},schoolId,input});
 assert.equal(result.id,'monthly:s1:math');
 assert.equal(writes.length,1);
 assert.equal(writes[0][0],'marks/monthly:s1:math');
}
// Subjects without configured components retain their existing raw-mark path.
for(const name of ['Computer','Computer Science','Nepali','Mathematics','New Optional Subject']){
 const {api,writes}=mock({'subjects/math':{schoolId,class:classId,active:true,name,theoryFullMarks:100,practicalFullMarks:100}});
 await createSchoolMarkOnly({db:{},api,actor:{role:'school_admin',active:true,schoolId},schoolId,input});
 assert.equal(writes.length,1,'Subject name alone must not force a hardcoded assessment scheme');
}
// A subject's own non-default configured limits allow valid marks and reject over-limit marks.
for(const [name,theoryFullMarks,practicalFullMarks,validTheory,validPractical] of [
 ['Computer',4,36,4,36],['Nepali',23.5,7.25,23.5,7.25],
 ['New Optional Subject','70','30',70,30],['New Subject',300,120,300,120]
]){
 const subject={schoolId,class:classId,active:true,name,theoryFullMarks,practicalFullMarks};
 const {api,writes}=mock({'subjects/math':subject});
 await createSchoolMarkOnly({db:{},api,actor:{role:'school_admin',active:true,schoolId},schoolId,input:{...input,theory:validTheory,practical:validPractical}});
 assert.equal(writes.length,1,'Configured full marks must permit valid marks for '+name);
}
// Missing or incomplete Examination Settings must fail closed for every subject.
for(const settings of [{}, {theoryFullMarks:100}, {practicalFullMarks:100}]){
 const {api,writes}=mock({'subjects/math':{schoolId,class:classId,active:true,name:'Any Subject',...settings}});
 await assert.rejects(createSchoolMarkOnly({db:{},api,actor:{role:'school_admin',active:true,schoolId},schoolId,input}),/full marks required/);
 assert.equal(writes.length,0);
}
// A missing teacher assignment cannot be bypassed by a teacher UID.
{
 const {api,writes}=mock();
 await assert.rejects(createSchoolMarkOnly({db:{},api,actor:{role:'teacher',active:true,schoolId,uid:'teacher-1'},schoolId,input}),/assignment/i);
 assert.equal(writes.length,0);
}
// Invalid marks and missing subject assignments must fail before any write.
for(const badInput of [{...input,theory:NaN},{...input,practical:-1},{...input,studentId:'../other'}]){
 const {api,writes}=mock();
 await assert.rejects(createSchoolMarkOnly({db:{},api,actor:{role:'school_admin',active:true,schoolId},schoolId,input:badInput}));
 assert.equal(writes.length,0);
}
// Existing marks, cross-school records, and configured component marks for ANY subject cannot be bypassed.
for(const [overrides,message] of [
 [{'marks/monthly:s1:math':{schoolId}},/already exists/],
 [{'component_marks/monthly:s1:math':{schoolId}},/already exists/],
 [{'students/s1':{schoolId:'87654321',class:classId}},/Student missing/],
 [{'subjects/math':{schoolId:'87654321',class:classId,active:true,name:'Math'}},/Subject missing/],
 [{'subject_assignments/s1:math':{schoolId:'87654321',class:classId,studentId:'s1',subjectId,active:true}},/assignment required/],
 [{'subjects/math':{schoolId,class:classId,active:true,name:'Computer',theoryFullMarks:100,practicalFullMarks:100,components:[{name:'Custom',fullMarks:47}]}},/Configured subject requires Assessment Settings/],
 [{'subjects/math':{schoolId,class:classId,active:true,name:'Nepali',theoryFullMarks:100,practicalFullMarks:100,components:[{name:'Internal',fullMarks:12}]}},/Configured subject requires Assessment Settings/],
 [{'subjects/math':{schoolId,class:classId,active:true,name:'New Optional Subject',theoryFullMarks:100,practicalFullMarks:100,components:[{name:'Project',fullMarks:73}]}},/Configured subject requires Assessment Settings/]
]){
 const {api,writes}=mock(overrides);
 await assert.rejects(createSchoolMarkOnly({db:{},api,actor:{role:'school_admin',active:true,schoolId},schoolId,input}),message);
 assert.equal(writes.length,0,'No records may be written on rejected marks');
}
// A valid, assigned teacher is allowed to create only their assigned mark.
{
 const {api,writes}=mock({
  ['teacher_assignments/'+schoolId+':teacher-1:'+classId+':'+subjectId]:{
   schoolId,uid:'teacher-1',classId,subjectId,active:true
  }
 });
 const result=await createSchoolMarkOnly({db:{},api,actor:{role:'teacher',active:true,schoolId,uid:'teacher-1'},schoolId,input});
 assert.equal(result.id,'monthly:s1:math');
 assert.equal(writes.length,1);
}
// Reject a session whose role, school or active state changes while Firestore reads are in flight.
for(const mutate of [
 actor=>{actor.active=false},
 actor=>{actor.role='viewer'},
 actor=>{actor.schoolId='87654321'},
 actor=>{actor.uid='another-user'}
]){
 const actor={role:'school_admin',active:true,schoolId,uid:'admin-1'};
 const {api,writes}=mock();
 const original=api.runTransaction;
 api.runTransaction=(db,callback)=>original(db,async tx=>{
  const get=tx.get;
  let changed=false;
  tx.get=async ref=>{
   const result=await get(ref);
   if(!changed){changed=true;mutate(actor)}
   return result;
  };
  return callback(tx);
 });
 await assert.rejects(createSchoolMarkOnly({db:{},api,actor,schoolId,input}),/identity changed/);
 assert.equal(writes.length,0);
}
// Every subject must obey its own configured limits, not a Computer-only scale.
for(const [name,theoryFullMarks,practicalFullMarks] of [['Computer',4,36],['Nepali',20,10],['New Optional Subject',24,6]]){
 const {api,writes}=mock({'subjects/math':{schoolId,class:classId,active:true,name,theoryFullMarks,practicalFullMarks}});
 await assert.rejects(createSchoolMarkOnly({db:{},api,actor:{role:'school_admin',active:true,schoolId},schoolId,input}),/exceed/);
 assert.equal(writes.length,0);
}
console.log('V47 direct mark creation authorization checks passed');
