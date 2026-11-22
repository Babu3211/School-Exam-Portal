import assert from 'node:assert/strict';
import {saveVerifiedSmallClassMarks} from './verified-small-class-mark-save.mjs';
const schoolId='12345678',classId='9',term='1st',subjectId='math',actor={uid:'admin-a',role:'school_admin',active:true,schoolId};
const entry=id=>({studentId:id,class:classId,term,subjectId,theory:30,practical:10});
function mock(ids=['s1','s2']){
 const records=new Map([['subjects/math',{schoolId,class:classId,active:true,name:'Mathematics',theoryFullMarks:100,practicalFullMarks:100}]]);
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
// Large classes must fail before ANY transaction, even after multi-page roster reads.
{
 const ids=Array.from({length:101},(_,i)=>'s'+String(i+1).padStart(3,'0'));
 const {api,writes}=mock(ids);
 let transactions=0;
 const original=api.runTransaction;
 api.runTransaction=async(...params)=>{transactions++;return original(...params)};
 await assert.rejects(saveVerifiedSmallClassMarks({...base,api,entries:ids.map(entry)}),/above 3/);
 assert.equal(writes.length,0);
 assert.equal(transactions,0,'Large class must never enter a mark-writing transaction');
}
// Authorization must be rejected before even reading the school roster.
for(const unauthorized of [
 {role:'viewer',active:true,schoolId},
 {role:'teacher',active:true,schoolId},
 {role:'super_admin',active:true},
 {role:'school_admin',active:false,schoolId},
 {role:'school_admin',active:true,schoolId:'87654321'},
 null
]){
 const {api,writes}=mock();
 let reads=0,transactions=0;
 const read=api.getDocs,transaction=api.runTransaction;
 api.getDocs=async(...args)=>{reads++;return read(...args)};
 api.runTransaction=async(...args)=>{transactions++;return transaction(...args)};
 await assert.rejects(saveVerifiedSmallClassMarks({...base,actor:unauthorized,api,entries:[entry('s1'),entry('s2')]}),/School Admin permission/);
 assert.equal(reads,0,'Unauthorized actor must not fetch student roster');
 assert.equal(transactions,0,'Unauthorized actor must not write marks');
 assert.equal(writes.length,0);
}
// An in-flight roster request must not authorize a save after the actor changes.
for(const change of [
 actor=>{actor.active=false},
 actor=>{actor.role='viewer'},
 actor=>{actor.schoolId='87654321'},
 actor=>{actor.uid='different-user'}
]){
 const changingActor={...actor,uid:'admin-a'};
 const {api,writes}=mock();
 const originalRead=api.getDocs;
 let transactions=0;
 api.getDocs=async(...args)=>{const result=await originalRead(...args);change(changingActor);return result};
 const originalTransaction=api.runTransaction;
 api.runTransaction=async(...args)=>{transactions++;return originalTransaction(...args)};
 await assert.rejects(saveVerifiedSmallClassMarks({...base,actor:changingActor,api,entries:[entry('s1'),entry('s2')]}),/School membership changed during roster query|School membership changed during roster load|School Admin identity changed during roster load/);
 assert.equal(transactions,0);
 assert.equal(writes.length,0);
}
console.log('V47 verified small-class mark save tests passed');
