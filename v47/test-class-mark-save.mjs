import assert from 'node:assert/strict';
import {saveCompleteClassMarks} from './class-mark-save.mjs';
const schoolId='school-a',classId='9',term='1st',subjectId='math';
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
for(const [overrides,message] of [
 [{entries:[mark('s1')]},/Cannot save/],
 [{entries:[mark('s1'),mark('s1')]},/Duplicate student/],
 [{entries:[mark('s1'),mark('s2',{subjectId:'science'})]},/Mixed class/],
 [{entries:[mark('s1'),mark('s2',{theory:''})]},/Marks must/],
 [{actor:{role:'viewer',active:true,schoolId}},/School Admin/],
 [{actor:{role:'school_admin',active:true,schoolId:'school-b'}},/School Admin/],
 [{expectedStudentIds:Array.from({length:11},(_,i)=>'s'+i),entries:Array.from({length:11},(_,i)=>mark('s'+i))},/at most 10/]
 ]){
 const {api,writes}=mock();
 await assert.rejects(saveCompleteClassMarks({...args,...overrides,db:{},api}),message);
 assert.equal(writes.length,0,'Failure must not write marks');
}
for(const [overrides,message] of [
 [{'subjects/math':null},/Active subject/],
 [{'students/s2':null},/Student roster changed/],
 [{'students/s2':{schoolId:'school-b',class:classId}},/Student roster changed/],
 [{'subject_assignments/s2:math':null},/Student subject assignment/],
 [{'marks/1st:s1:math':{schoolId}},/Existing mark/],
 [{'component_marks/1st:s1:math':{schoolId}},/Existing mark/]
 ]){
 const {api,writes}=mock(overrides);
 await assert.rejects(saveCompleteClassMarks({...args,db:{},api}),message);
 assert.equal(writes.length,0,'Failed transaction must write nothing');
}
console.log('V47 atomic class marks save contract checks passed');
