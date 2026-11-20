import assert from 'node:assert/strict';
import {createSchoolMarkOnly} from './mark-create-service.mjs';
const schoolId='school-a',classId='9',subjectId='math';
const input={studentId:'s1',subjectId,class:classId,term:'monthly',theory:25,practical:10};
function mock(){
 const docs=new Map([
  ['students/s1',{schoolId,class:classId}],
  ['subjects/math',{schoolId,class:classId,active:true,name:'Math'}],
  ['subject_assignments/s1:math',{schoolId,class:classId,studentId:'s1',subjectId,active:true}]
 ]);
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
 {role:'school_admin',active:true,schoolId:'school-b'},
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
console.log('V47 direct mark creation authorization checks passed');
