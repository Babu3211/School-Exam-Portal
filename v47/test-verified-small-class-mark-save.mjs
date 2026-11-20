import assert from 'node:assert/strict';
import {saveVerifiedSmallClassMarks} from './verified-small-class-mark-save.mjs';
const schoolId='school-a',classId='9',term='1st',subjectId='math',actor={role:'school_admin',active:true,schoolId};
const entry=id=>({studentId:id,class:classId,term,subjectId,theory:30,practical:10});
function mock(ids=['s1','s2']){
 const records=new Map([['subjects/math',{schoolId,class:classId,active:true,name:'Mathematics'}]]);
 for(const id of ids){records.set('students/'+id,{schoolId,class:classId});records.set('subject_assignments/'+id+':math',{schoolId,class:classId,studentId:id,subjectId});}
 const writes=[];
 const api={
  doc:(_db,...parts)=>parts.slice(2).join('/'),
  collection:(_db,...parts)=>parts.join('/'),where:(...x)=>x,orderBy:x=>x,limit:x=>x,startAfter:x=>({cursor:x}),query:(...x)=>x,
  getDocs:async q=>{
   const cursor=q.find(x=>x?.cursor)?.cursor;
   const start=cursor?ids.indexOf(cursor.id)+1:0;
   const limit=q.find(x=>typeof x==='number')??101;
   return {docs:ids.slice(start,start+limit).map(id=>({id,data:()=>records.get('students/'+id)}))};
  },
  runTransaction:async(_db,callback)=>{const pending=[];const tx={get:async ref=>({exists:()=>records.has(ref),data:()=>records.get(ref)}),set:(ref,data)=>pending.push([ref,data])};const result=await callback(tx);writes.push(...pending);return result;}
 };
 return {api,writes};
}
const base={db:{},actor,schoolId,classId,term,subjectId};
{
 const {api,writes}=mock();
 const result=await saveVerifiedSmallClassMarks({...base,api,entries:[entry('s1'),entry('s2')]});
 assert.equal(result.saved,2);assert.equal(writes.length,2);
}
for(const [ids,entries,pattern] of [
 [['s1','s2'],[entry('s1')],/Cannot save/],
 [['s1','s2'],[entry('s1'),entry('s1')],/Duplicate/],
 [['s1','s2'],[entry('s1'),entry('foreign')],/not in selected/],
 [['s1','s2','s3','s4'],['s1','s2','s3','s4'].map(entry),/above 3/]
]){
 const {api,writes}=mock(ids);
 await assert.rejects(saveVerifiedSmallClassMarks({...base,api,entries}),pattern);
 assert.equal(writes.length,0);
}
console.log('V47 verified small-class mark save tests passed');
