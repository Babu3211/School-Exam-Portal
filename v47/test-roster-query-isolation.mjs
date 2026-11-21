import assert from 'node:assert/strict';
import {loadClassRoster} from './attendance-roster.mjs';
const schoolId='12345678',schoolClass='9',actor={role:'school_admin',active:true,schoolId};
function apiFor(records){
 return {
  where:(...x)=>x,orderBy:x=>x,limit:x=>x,startAfter:x=>x,
  collection:(_db,...parts)=>parts.join('/'),query:(...x)=>x,
  getDocs:async()=>({docs:records.map(([id,data])=>({id,data:()=>data}))})
 };
}
const base={db:{},actor,schoolId,schoolClass,pageSize:2};
const students=[['s1',{schoolId,class:'9',name:'First',id:'forged'}],['s2',{schoolId,class:'9',name:'Second'}]];
const result=await loadClassRoster({...base,api:apiFor(students)});
assert.equal(result.students.length,2);
assert.equal(result.students[0].id,'s1');
assert.equal(result.students[0].name,'First');
for(const data of [
 {schoolId:'87654321',class:'9'},
 {schoolId,class:'8'},
 {class:'9'}
]){
 await assert.rejects(loadClassRoster({...base,api:apiFor([['s1',data]])}),/Cross-school or wrong-class/);
}
await assert.rejects(loadClassRoster({...base,actor:{role:'viewer',active:true,schoolId:'87654321'},api:apiFor(students)}),/School membership/);
await assert.rejects(loadClassRoster({...base,api:apiFor([['s1',{schoolId,class:'9'}],['s1',{schoolId,class:'9'}]])}),/Invalid or duplicate roster document ID/);
await assert.rejects(loadClassRoster({...base,api:apiFor([['../evil',{schoolId,class:'9'}]])}),/Invalid or duplicate roster document ID/);
await assert.rejects(loadClassRoster({...base,pageSize:101,api:apiFor(students)}),/Page size/);
await assert.rejects(loadClassRoster({...base,pageSize:1,api:apiFor([['s1',{schoolId,class:'9'}],['s2',{schoolId:'87654321',class:'9'}]])}),/Cross-school or wrong-class/);
await assert.rejects(loadClassRoster({...base,api:apiFor([students[1],students[0]])}),/out-of-order/);
await assert.rejects(loadClassRoster({...base,pageSize:1,api:apiFor([students[1],students[0]])}),/out-of-order/);
await assert.rejects(loadClassRoster({...base,cursor:{id:'s2'},api:apiFor([students[0]])}),/out-of-order/);
for(const cursor of [{}, {id:'../87654321'}, {id:''}, {id:12}, {id:'x'.repeat(129)}, 's1']){
 let queries=0;
 const api=apiFor(students),original=api.getDocs;
 api.getDocs=async(...args)=>{queries++;return original(...args)};
 await assert.rejects(loadClassRoster({...base,cursor,api}),/Invalid roster pagination cursor/);
 assert.equal(queries,0,'Invalid cursor must be rejected before querying Firestore');
}
// Session changes while Firestore is loading must invalidate the response.
for(const mutate of [
 a=>{a.active=false},
 a=>{a.role='viewer'},
 a=>{a.schoolId='87654321'},
 a=>{a.uid='other-user'}
]){
 const changingActor={role:'school_admin',active:true,schoolId,uid:'admin-1'};
 const api=apiFor(students),getDocs=api.getDocs;
 api.getDocs=async(...args)=>{
  const result=await getDocs(...args);
  mutate(changingActor);
  return result;
 };
 await assert.rejects(loadClassRoster({...base,actor:changingActor,api}),/School membership changed/);
}
console.log('V47 roster query isolation tests passed');
