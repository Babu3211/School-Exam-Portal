import assert from 'node:assert/strict';
import {loadAttendanceByClassDate} from './attendance-query.mjs';
import {createSchoolStore} from './firestore-adapter.mjs';

const schoolId='12345',date='2026-11-22';
const actor={uid:'admin1',role:'school_admin',active:true,schoolId};
function mockRows(count,collectionName){
 const data=Array.from({length:count},(_,i)=>{
  const id=(collectionName==='attendance'?date+'_':'')+'student'+String(i).padStart(4,'0');
  return {id,data:{schoolId,class:'9',date,present:true,studentId:'student'+String(i).padStart(4,'0')}};
 });
 let cursorValues=[];
 const api={
  collection:(_db,...segments)=>segments.join('/'),
  doc:(_db,...segments)=>segments.join('/'),
  where:(...args)=>({where:args}),
  orderBy:field=>({orderBy:field}),
  limit:n=>({limit:n}),
  startAfter:id=>{
   assert.equal(typeof id,'string','startAfter requires ordered document ID');
   cursorValues.push(id);
   return {cursor:id};
  },
  query:(...args)=>args,
  getDocs:async constraints=>{
   const offset=constraints.find(v=>v?.cursor)?.cursor;
   const start=offset===undefined?0:data.findIndex(row=>row.id===offset)+1;
   const limit=constraints.find(v=>v?.limit)?.limit;
   return {docs:data.slice(start,start+limit).map(row=>({id:row.id,data:()=>row.data}))};
  }
 };
 return {api,data,cursorValues};
}
for(const count of [1,50,51,100,101,500]){
 const {api,cursorValues}=mockRows(count,'attendance');
 let cursor=null,total=0,pages=0;
 do{
  const result=await loadAttendanceByClassDate({db:{},api,actor,schoolId,schoolClass:'9',date,pageSize:50,cursor});
  total+=result.records.length;pages++;
  assert.ok(result.records.every(record=>record.schoolId===schoolId&&record.class==='9'&&record.date===date));
  cursor=result.hasMore?result.cursor:null;
 }while(cursor);
 assert.equal(total,count);
 assert.equal(pages,Math.ceil(count/50));
 assert.equal(cursorValues.length,pages-1);
}
for(const invalid of ['student1',{}, {id:''},{id:'../evil'},{id:33}]){
 const {api}=mockRows(5,'attendance');
 let calls=0;const getDocs=api.getDocs;api.getDocs=async (...args)=>{calls++;return getDocs(...args)};
 await assert.rejects(loadAttendanceByClassDate({db:{},api,actor,schoolId,schoolClass:'9',date,pageSize:2,cursor:invalid}),/Invalid attendance pagination cursor/);
 assert.equal(calls,0);
}
for(const mutate of [
 a=>{a.active=false},
 a=>{a.uid='someone-else'},
 a=>{a.role='viewer'},
 a=>{a.schoolId='67890'}
]){
 const active={...actor}, {api}=mockRows(5,'attendance');
 const getDocs=api.getDocs;api.getDocs=async(...args)=>{const result=await getDocs(...args);mutate(active);return result};
 await assert.rejects(loadAttendanceByClassDate({db:{},api,actor:active,schoolId,schoolClass:'9',date,pageSize:2}),/School membership changed/);
}
for(const change of [{schoolId:'67890'},{class:'8'},{date:'2026-11-21'}]){
 const {api}=mockRows(5,'attendance');
 api.getDocs=async()=>({docs:[{id:date+'_student0000',data:()=>({...api._fake,schoolId,class:'9',date,present:true,studentId:'student0000',...change})}]});
 await assert.rejects(loadAttendanceByClassDate({db:{},api,actor,schoolId,schoolClass:'9',date,pageSize:2}),/Cross-school or wrong-class/);
}
for(const count of [1,100,101,500]){
 const {api,cursorValues}=mockRows(count,'students');
 const member={...actor};
 const store=createSchoolStore({db:{},api,member,schoolId,assertSession:()=>{if(member.active!==true)throw Error('revoked')}});
 let cursor=null,total=0,pages=0;
 do{
  const result=await store.listPage('students',{pageSize:100,cursor});
  total+=result.records.length;pages++;
  cursor=result.hasMore?result.cursor:null;
 }while(cursor);
 assert.equal(total,count);
 assert.equal(pages,Math.ceil(count/100));
 assert.equal(cursorValues.length,pages-1);
}
{
 const {api}=mockRows(3,'students');
 const store=createSchoolStore({db:{},api,member:actor,schoolId});
 let calls=0;const getDocs=api.getDocs;api.getDocs=async(...args)=>{calls++;return getDocs(...args)};
 await assert.rejects(store.listPage('students',{cursor:{id:'../bad'}}),/Invalid pagination cursor/);
 assert.equal(calls,0);
}
console.log('V47 attendance and school record pagination: page boundaries, ID cursors, tenant isolation, actor changes passed');
