import assert from 'node:assert/strict';
import {createSchoolStore} from './firestore-adapter.mjs';
const schoolId='300160003',member={uid:'teacherA',role:'school_admin',schoolId,active:true};
const assignments=[
 {id:'s1:math',schoolId,studentId:'s1',subjectId:'math',class:'9'},
 {id:'s2:math',schoolId,studentId:'s2',subjectId:'math',class:'9'},
 {id:'s3:math',schoolId,studentId:'s3',subjectId:'math',class:'9'}
];
let reads=0;
const api={
 collection:(_db,path)=>path,doc:(_db,path)=>path,
 query:(path,...constraints)=>({path,constraints}),
 orderBy:name=>({field:name}),limit:n=>({limit:n}),
 startAfter:id=>({cursor:id}),
 getDocs:async query=>{
  assert.equal(query.path,'schools/'+schoolId+'/subject_assignments');
  const start=query.constraints.find(c=>Object.hasOwn(c,'cursor'))?.cursor;
  const limit=query.constraints.find(c=>Object.hasOwn(c,'limit')).limit;
  reads++;
  const rows=assignments.filter(x=>start===undefined||x.id>start).slice(0,limit);
  return {docs:rows.map(x=>({id:x.id,ref:{path:'schools/'+schoolId+'/subject_assignments/'+x.id},data:()=>({...x})}))};
 }
};
const store=createSchoolStore({db:{},api,member,schoolId,assertSession:()=>{}});
const first=await store.listPage('subject_assignments',{pageSize:1});
assert.equal(first.records.length,1);
assert.equal(first.records[0].id,'s1:math');
assert.equal(first.hasMore,true);
const second=await store.listPage('subject_assignments',{pageSize:1,cursor:first.cursor});
assert.equal(second.records[0].id,'s2:math');
const third=await store.listPage('subject_assignments',{pageSize:1,cursor:second.cursor});
assert.equal(third.records[0].id,'s3:math');
assert.equal(third.hasMore,false);
assert.equal(reads,3);
await assert.rejects(store.listPage('subject_assignments',{pageSize:1,cursor:{id:'s1::math'}}),/Invalid pagination cursor/);
await assert.rejects(store.listPage('subject_assignments',{pageSize:1,cursor:{id:'../student'}}),/Invalid pagination cursor/);
await assert.rejects(store.listPage('students',{pageSize:1,cursor:{id:'s1:math'}}),/Invalid pagination cursor/);
await assert.rejects(store.listPage('subject_assignments',{pageSize:1,cursor:{id:'s1:math',schoolId:'999999999'}}),/Invalid pagination cursor/);
await assert.rejects(store.listPage('subject_assignments',{pageSize:1,cursor:{id:'s1:math',ref:{path:'schools/999999999/subject_assignments/s1:math'}}}),/Invalid pagination cursor/);
const wrong={...api,getDocs:async()=>({docs:[{id:'s1:math',ref:{path:'schools/999999999/subject_assignments/s1:math'},data:()=>({...assignments[0]})}]})};
const bad=createSchoolStore({db:{},api:wrong,member,schoolId,assertSession:()=>{}});
await assert.rejects(bad.listPage('subject_assignments',{pageSize:1}),/Malformed|out-of-order/);
console.log('PASS colon-ID tenant pagination across subject assignments, cross-school cursor and record rejection');
