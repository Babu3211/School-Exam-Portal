import assert from 'node:assert/strict';
import {loadAttendanceByClassDate} from './attendance-query.mjs';

const schoolId='12345',otherSchool='67890',schoolClass='9',date='2026-11-22';
const actor=()=>({uid:'admin123',active:true,role:'school_admin',schoolId});
const record=(id,school=schoolId,mutate=()=>{})=>({
 id,ref:{path:'schools/'+school+'/attendance/'+id},
 data:()=>{mutate();return {schoolId:school,studentId:id,class:schoolClass,date,present:true}}
});
const docs=Array.from({length:205},(_,i)=>record('student'+String(i).padStart(4,'0')));
const makeApi=(getDocs)=>({
 collection:(_db,...path)=>path.join('/'),
 query:(path,...conditions)=>({path,conditions}),
 where:(...args)=>({where:args}),orderBy:field=>({orderBy:field}),
 limit:count=>({limit:count}),
 startAfter:id=>{assert.equal(typeof id,'string','Firestore must receive ordered ID cursor');return {cursor:id}},
 getDocs:getDocs??(async q=>{
  const after=q.conditions.find(v=>v.cursor)?.cursor;
  const count=q.conditions.find(v=>typeof v.limit==='number')?.limit;
  const offset=after?docs.findIndex(doc=>doc.id===after)+1:0;
  return {docs:docs.slice(offset,offset+count)};
 })
});
const input={db:{},schoolId,schoolClass,date,pageSize:100};
{
 const a=await loadAttendanceByClassDate({...input,api:makeApi(),actor:actor()});
 const b=await loadAttendanceByClassDate({...input,api:makeApi(),actor:actor(),cursor:a.cursor});
 const c=await loadAttendanceByClassDate({...input,api:makeApi(),actor:actor(),cursor:b.cursor});
 assert.deepEqual([a.records.length,b.records.length,c.records.length],[100,100,5]);
 assert.equal(a.hasMore,true);
 assert.equal(b.hasMore,true);
 assert.equal(c.hasMore,false);
 assert.equal(new Set([...a.records,...b.records,...c.records].map(x=>x.id)).size,205);
}
for(const cursor of [
 {id:'student0010',ref:{path:'schools/67890/attendance/student0010'}},
 {id:'student0010',schoolId:otherSchool},
 {id:'student0010',date:'2026-11-21'},
 {id:'student0010',class:'8'},
 {id:'../../foreign'},
 {id:11}
]){
 let reads=0;
 const api=makeApi(async()=>{reads++;return {docs:[]}});
 await assert.rejects(()=>loadAttendanceByClassDate({...input,api,actor:actor(),cursor}),/Invalid attendance pagination cursor/);
 assert.equal(reads,0,'Wrong cursor must be rejected before querying');
}
for(const change of [
 a=>{a.role='viewer2'},a=>{a.active=false},a=>{a.uid='switched_admin'},a=>{a.schoolId=otherSchool}
]){
 const member=actor();
 const api=makeApi(async()=>{change(member);return {docs:[record('student0001')]}});
 await assert.rejects(()=>loadAttendanceByClassDate({...input,api,actor:member}),/membership changed/);
}
for(const change of [
 a=>{a.role='viewer2'},a=>{a.active=false},a=>{a.uid='switched_admin'}
]){
 const member=actor();
 const api=makeApi(async()=>({docs:[record('student0001',schoolId,()=>change(member))]}));
 await assert.rejects(()=>loadAttendanceByClassDate({...input,api,actor:member}),/membership changed/);
}
await assert.rejects(()=>loadAttendanceByClassDate({
 ...input,actor:actor(),api:makeApi(async()=>({docs:[record('student0001',otherSchool)]}))
}),/out-of-order|Cross-school|Malformed/);
await assert.rejects(()=>loadAttendanceByClassDate({
 ...input,actor:actor(),api:makeApi(async()=>({docs:[record('student0002'),record('student0001')]}))
}),/out-of-order/);
await assert.rejects(()=>loadAttendanceByClassDate({
 ...input,actor:actor(),api:makeApi(async()=>({docs:[record('student0001'),record('student0001')]}))
}),/out-of-order/);
console.log('V47 attendance pagination: 205 records, cursor isolation, role swaps, malformed data and ordering checks passed');
