import assert from 'node:assert/strict';
import {saveCompleteClassMarks} from './class-mark-save.mjs';
import {EXAM_TERMS} from './term-catalog.mjs';
const schoolId='12345678',classId='9',term='1st',subjectId='math';
const actor={role:'school_admin',active:true,schoolId};
const mark=(studentId,overrides={})=>({studentId,class:classId,term,subjectId,theory:30,practical:10,...overrides});
const args={actor,schoolId,classId,term,subjectId,expectedStudentIds:['s1','s2'],entries:[mark('s1'),mark('s2')]};
function mock(overrides={}){
 const records=new Map([
  ['subjects/math',{schoolId,class:classId,active:true,name:'Mathematics'}],
  ...['s1','s2'].flatMap(id=>[
   ['students/'+id,{schoolId,class:classId}],
   ['subject_assignments/'+id+':math',{schoolId,class:classId,studentId:id,subjectId}]
  ])
 ]);
 for(const [key,value] of Object.entries(overrides))value===null?records.delete(key):records.set(key,value);
 const writes=[];
 const api={
  doc:(_db,...segments)=>segments.slice(2).join('/'),
  runTransaction:async(_db,callback)=>{
   const pending=[];
   const tx={
    get:async ref=>({exists:()=>records.has(ref),data:()=>records.get(ref)}),
    set:(ref,value)=>pending.push([ref,value])
   };
   const result=await callback(tx);
   for(const [ref,value] of pending){records.set(ref,value);writes.push([ref,value]);}
   return result;
  }
 };
 return {api,writes,records};
}
{
 const {api,writes}=mock();
 const result=await saveCompleteClassMarks({...args,db:{},api});
 assert.equal(result.saved,2);
 assert.equal(writes.length,2);
 assert.equal(writes[0][0],'marks/1st:s1:math');
 assert.equal(writes[1][1].schoolId,schoolId);
}
// Exact safe transaction boundary: three students are permitted, four are blocked.
{
 const {api,writes}=mock({
  'students/s3':{schoolId,class:classId},
  'subject_assignments/s3:math':{schoolId,class:classId,studentId:'s3',subjectId}
 });
 const result=await saveCompleteClassMarks({...args,db:{},api,
  expectedStudentIds:['s1','s2','s3'],entries:[mark('s1'),mark('s2'),mark('s3')]});
 assert.equal(result.saved,3);
 assert.equal(writes.length,3);
 assert.deepEqual(writes.map(([ref])=>ref),['marks/1st:s1:math','marks/1st:s2:math','marks/1st:s3:math']);
}
for(const [overrides,message] of [
 [{entries:[mark('s1')]},/Cannot save/],
 [{entries:[mark('s1'),mark('s1')]},/Duplicate student/],
 [{entries:[mark('s1'),mark('s2',{subjectId:'science'})]},/Mixed class/],
 [{entries:[mark('s1'),mark('s2',{theory:''})]},/Marks must/],
 [{actor:{role:'viewer',active:true,schoolId}},/School Admin/],
 [{actor:{role:'teacher',active:true,schoolId}},/School Admin/],
 [{actor:{role:'super_admin',active:true}},/School Admin/],
 [{actor:{role:'school_admin',active:false,schoolId}},/School Admin/],
 [{actor:{role:'school_admin',active:true,schoolId:'87654321'}},/School Admin/],
 [{expectedStudentIds:Array.from({length:4},(_,i)=>'s'+i),entries:Array.from({length:4},(_,i)=>mark('s'+i))},/at most 3/]
 ]){
 const {api,writes}=mock();
 await assert.rejects(saveCompleteClassMarks({...args,...overrides,db:{},api}),message);
 assert.equal(writes.length,0,'Failure must not write marks');
}
for(const [overrides,message] of [
 [{'subjects/math':null},/Active subject/],
 [{'students/s2':null},/Student roster changed/],
 [{'students/s2':{schoolId:'87654321',class:classId}},/Student roster changed/],
 [{'subject_assignments/s2:math':null},/Student subject assignment/],
 [{'marks/1st:s1:math':{schoolId}},/Existing mark/],
 [{'component_marks/1st:s1:math':{schoolId}},/Existing mark/]
 ]){
 const {api,writes}=mock(overrides);
 await assert.rejects(saveCompleteClassMarks({...args,db:{},api}),message);
 assert.equal(writes.length,0,'Failed transaction must write nothing');
}
for(const [overrides,message] of [
 [{'subjects/math':{schoolId,class:classId,active:false,name:'Mathematics'}},/Active subject/],
 [{'subjects/math':{schoolId:'87654321',class:classId,active:true,name:'Mathematics'}},/Active subject/],
 [{'subjects/math':{schoolId,class:'8',active:true,name:'Mathematics'}},/Active subject/],
 [{'subject_assignments/s2:math':{schoolId:'87654321',class:classId,studentId:'s2',subjectId}},/Student subject assignment/],
 [{'subject_assignments/s2:math':{schoolId,class:'8',studentId:'s2',subjectId}},/Student subject assignment/],
 [{'subject_assignments/s2:math':{schoolId,class:classId,studentId:'s1',subjectId}},/Student subject assignment/]
 ]){
 const {api,writes}=mock(overrides);
 await assert.rejects(saveCompleteClassMarks({...args,db:{},api}),message);
 assert.equal(writes.length,0);
}
for(const name of ['Computer','Computer Science','Mathematics','Nepali','New Optional Subject']){
 const {api,writes}=mock({'subjects/math':{schoolId,class:classId,active:true,name,components:[{name:'Custom Assessment',fullMarks:37}]}});
 await assert.rejects(saveCompleteClassMarks({...args,db:{},api}),/Configured subject requires Assessment Settings/);
 assert.equal(writes.length,0,'Configured component marks must never be saved as raw marks');
}

{
 const {api,writes}=mock({'subject_assignments/s2:math':{schoolId,class:classId,studentId:'s2',subjectId,active:false}});
 await assert.rejects(saveCompleteClassMarks({...args,db:{},api}),/Student subject assignment/);
 assert.equal(writes.length,0);
}
// Late failure in a three-student transaction must roll back ALL pending writes.
for(const broken of [
 {'students/s3':null},
 {'students/s3':{schoolId:'87654321',class:classId}},
 {'subject_assignments/s3:math':null},
 {'subject_assignments/s3:math':{schoolId,class:classId,studentId:'s3',subjectId,active:false}},
 {'marks/1st:s3:math':{schoolId}},
 {'component_marks/1st:s3:math':{schoolId}}
]){
 const {api,writes}=mock({
  'students/s3':{schoolId,class:classId},
  'subject_assignments/s3:math':{schoolId,class:classId,studentId:'s3',subjectId},
  ...broken
 });
 await assert.rejects(saveCompleteClassMarks({...args,db:{},api,
  expectedStudentIds:['s1','s2','s3'],entries:[mark('s1'),mark('s2'),mark('s3')]}));
 assert.equal(writes.length,0,'Late validation failure must not partially save first two students');
}
// Each supported term must save under its own scoped document ID.
for(const examTerm of EXAM_TERMS){
 const {api,writes}=mock();
 const termEntries=[mark('s1',{term:examTerm}),mark('s2',{term:examTerm})];
 const result=await saveCompleteClassMarks({...args,term:examTerm,entries:termEntries,db:{},api});
 assert.equal(result.saved,2);
 assert.deepEqual(writes.map(([ref])=>ref),[
  'marks/'+examTerm+':s1:math','marks/'+examTerm+':s2:math'
 ]);
}
// A revoked or switched school session cannot complete an in-flight atomic save.
for(const mutate of [
 a=>{a.active=false},
 a=>{a.role='viewer'},
 a=>{a.schoolId='87654321'},
 a=>{a.uid='other-user'}
]){
 const changingActor={role:'school_admin',active:true,schoolId,uid:'admin-1'};
 const {api,writes}=mock(),original=api.runTransaction;
 api.runTransaction=(db,callback)=>original(db,async tx=>{
  const get=tx.get;let changed=false;
  tx.get=async ref=>{
   const result=await get(ref);
   if(!changed){changed=true;mutate(changingActor)}
   return result;
  };
  return callback(tx);
 });
 await assert.rejects(saveCompleteClassMarks({...args,actor:changingActor,db:{},api}),/School identity changed/);
 assert.equal(writes.length,0,'Revoked session must not write partial class marks');
}
// Reject any configured full-marks violation before writing the class.
for(const [theoryFullMarks,practicalFullMarks] of [[4,36],[20,7],[29,9]]){
 const {api,writes}=mock({'subjects/math':{schoolId,class:classId,active:true,name:'Any Subject',theoryFullMarks,practicalFullMarks}});
 await assert.rejects(saveCompleteClassMarks({...args,db:{},api}),/exceed/);
 assert.equal(writes.length,0);
}
console.log('V47 atomic class marks save contract checks passed');
