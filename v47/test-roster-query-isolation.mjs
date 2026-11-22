import assert from 'node:assert/strict';
import {loadClassRoster} from './attendance-roster.mjs';
const schoolId='12345678',schoolClass='9',actor={uid:'admin-1',role:'school_admin',active:true,schoolId};
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
{
 let actualCursor=null;
 const api=apiFor([students[1]]);
 api.startAfter=id=>{
  actualCursor=id;
  assert.equal(typeof id,'string','Firestore startAfter must receive a document ID string');
  return id;
 };
 const second=await loadClassRoster({...base,cursor:{id:'s1',name:'First',schoolId},api});
 assert.equal(actualCursor,'s1');
 assert.deepEqual(second.students.map(student=>student.id),['s2']);
}

for(const cursor of [{}, {id:'../87654321'}, {id:''}, {id:12}, {id:'x'.repeat(129)}, 's1']){
 let queries=0;
 const api=apiFor(students),original=api.getDocs;
 api.getDocs=async(...args)=>{queries++;return original(...args)};
 await assert.rejects(loadClassRoster({...base,cursor,api}),/Invalid roster pagination cursor/);
 assert.equal(queries,0,'Invalid cursor must be rejected before querying Firestore');
}
// Cursor may carry a server snapshot or an app-level school/class context.
// Reject stale cursors from another tenant or class before any network read.
for(const cursor of [
 {id:'s1',ref:{path:'schools/87654321/students/s1'}},
 {id:'s1',schoolId:'87654321'},
 {id:'s1',class:'8'}
]){
 let reads=0;
 const api=apiFor(students),getDocs=api.getDocs;
 api.getDocs=async(...args)=>{reads++;return getDocs(...args)};
 await assert.rejects(loadClassRoster({...base,cursor,api}),/Invalid roster pagination cursor/);
 assert.equal(reads,0);
}
{
 const foreignPath={...apiFor(students),getDocs:async()=>({docs:[{
  id:'s3',ref:{path:'schools/87654321/students/s3'},
  data:()=>({schoolId,class:'9',name:'Forged same-school data'})
 }]})};
 await assert.rejects(loadClassRoster({...base,api:foreignPath}),/Invalid or duplicate roster document ID/);
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
