import assert from 'node:assert/strict';
import {createSchoolStore} from './firestore-adapter.mjs';

const schoolId='12345',otherSchool='67890';
const member=()=>({uid:'viewer123',role:'viewer',schoolId,active:true});
const record=(id,school=schoolId,mutate=()=>{})=>({
 id,ref:{path:'schools/'+school+'/students/'+id},
 data:()=>{mutate();return {name:'Student '+id,schoolId:school}}
});
const items=Array.from({length:205},(_,i)=>record('student'+String(i).padStart(4,'0')));
const sdk=(getDocs)=>({
 collection:(_db,path)=>path,doc:(_db,path)=>path,
 orderBy:key=>({order:key}),limit:n=>({limit:n}),
 startAfter:id=>{assert.equal(typeof id,'string','Firestore document-ID cursor must be a string');return {after:id}},
 query:(path,...constraints)=>({path,constraints}),
 getDocs:getDocs??(async q=>{
  const previous=q.constraints.find(x=>x.after)?.after;
  const offset=previous?items.findIndex(x=>x.id===previous)+1:0;
  return {docs:items.slice(offset,offset+q.constraints.find(x=>x.limit).limit)};
 })
});
const makeStore=(actor,api=sdk())=>createSchoolStore({db:{},api,member:actor,schoolId});
for(const uid of [undefined,null,'','user/other']){
 assert.throws(()=>makeStore({...member(),uid}),/Authenticated school member required/);
}
{
 const store=makeStore(member());
 const a=await store.listPage('students',{pageSize:100});
 const b=await store.listPage('students',{pageSize:100,cursor:a.cursor});
 const c=await store.listPage('students',{pageSize:100,cursor:b.cursor});
 assert.deepEqual([a.records.length,b.records.length,c.records.length],[100,100,5]);
 assert.equal(a.hasMore,true);
 assert.equal(b.hasMore,true);
 assert.equal(c.hasMore,false);
 assert.equal(new Set([...a.records,...b.records,...c.records].map(x=>x.id)).size,205);
}
for(const change of [
 a=>{a.uid='anotherUid'},a=>{a.role='school_admin'},a=>{a.active=false},a=>{a.schoolId=otherSchool}
]){
 const actor=member();
 const api=sdk(async()=>{change(actor);return {docs:[record('a')]};});
 await assert.rejects(()=>makeStore(actor,api).listPage('students',{pageSize:2}),/membership changed/);
}
for(const change of [
 a=>{a.uid='anotherUid'},a=>{a.role='teacher'},a=>{a.active=false},a=>{a.schoolId=otherSchool}
]){
 const actor=member();
 const api=sdk(async()=>({docs:[record('a',schoolId,()=>change(actor))]}));
 await assert.rejects(()=>makeStore(actor,api).listPage('students',{pageSize:2}),/membership changed/);
}
{
 const store=makeStore(member());
 for(const cursor of [
  {id:'student0100',ref:{path:'schools/67890/students/student0100'}},
  {id:'student0100',schoolId:'67890'},
  {id:'../../foreign'},
  {id:10}
 ]){
  await assert.rejects(()=>store.listPage('students',{pageSize:10,cursor}),/Invalid pagination cursor/);
 }
}
{
 const store=makeStore(member(),sdk(async()=>({docs:[record('foreign',otherSchool)]})));
 await assert.rejects(()=>store.listPage('students',{pageSize:2}),/Cross-school|out-of-order/);
}
{
 const store=makeStore(member(),sdk(async()=>({docs:[{
  id:'student001',ref:{path:'schools/67890/students/student001'},data:()=>({schoolId,name:'Forged'})
 }]})));
 await assert.rejects(()=>store.listPage('students',{pageSize:2}),/Malformed or out-of-order/);
}
console.log('V47 school record pagination, role-change, cursor, and foreign-snapshot regressions passed');
