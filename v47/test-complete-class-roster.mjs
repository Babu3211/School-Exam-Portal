import assert from 'node:assert/strict';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
const schoolId='12345678',actor={uid:'admin-1',role:'school_admin',active:true,schoolId},classId='9';
const base={db:{},actor,schoolId,classId,pageSize:2};
const docs=[['s1',{schoolId,class:'9',name:'A'}],['s2',{schoolId,class:'9',name:'B'}],['s3',{schoolId,class:'9',name:'C'}]];
function mock(rows=docs){
 return {collection:(_db,...p)=>p.join('/'),where:(...a)=>a,orderBy:x=>x,limit:x=>x,startAfter:cursor=>{assert.equal(typeof cursor,'string','Firestore document-ID cursor must be a string, not a student object');return {cursor}},
 query:(...a)=>a,getDocs:async q=>{
  const c=q.find(x=>x?.cursor)?.cursor;
  const offset=c?rows.findIndex(x=>x[0]===c)+1:0;
  const limit=Number(q.find(x=>typeof x==='number')??3);
  return {docs:rows.slice(offset,offset+limit).map(([id,data])=>({id,data:()=>data}))};
 }};
}
const result=await loadCompleteClassRoster({...base,api:mock()});
assert.deepEqual(result.studentIds,['s1','s2','s3']);
assert.equal(result.count,3);
assert.equal(result.pages,2);
assert.equal(result.excludedInactive,0);
await assert.rejects(loadCompleteClassRoster({...base,api:mock(),maxStudents:2}),/exceeds 2/);
await assert.rejects(loadCompleteClassRoster({...base,api:mock([])}),/no students/);
// Inactive/withdrawn students must not be assigned attendance, even when a
// class query contains both archived and active student documents. Page
// lookahead still uses the full ordered raw roster and must not skip s3.
{
 const mixed=[
  ['s1',{schoolId,class:'9',name:'Withdrawn',active:false}],
  ['s2',{schoolId,class:'9',name:'Legacy active (field omitted)'}],
  ['s3',{schoolId,class:'9',name:'Enrolled',active:true}]
 ];
 const activeOnly=await loadCompleteClassRoster({...base,api:mock(mixed),activeOnly:true});
 const raw=await loadCompleteClassRoster({...base,api:mock(mixed)});
 assert.deepEqual(raw.studentIds,['s1','s2','s3'],'Marks staging retains inactive students for strict refusal');
 assert.deepEqual(activeOnly.studentIds,['s2','s3']);
 assert.equal(activeOnly.excludedInactive,1);
 assert.equal(activeOnly.count,2);
 assert.equal(activeOnly.pages,2);
 await assert.rejects(loadCompleteClassRoster({...base,activeOnly:true,api:mock([
  ['s1',{schoolId,class:'9',active:false}],
  ['s2',{schoolId,class:'9',active:false}]
 ])}),/no active students/);
 await assert.rejects(loadCompleteClassRoster({...base,activeOnly:'yes',api:mock(mixed)}),/Active-only roster option/);
}

await assert.rejects(loadCompleteClassRoster({...base,api:mock([docs[0],docs[0],docs[2]])}),/duplicate roster document ID|Duplicate student/);
await assert.rejects(loadCompleteClassRoster({...base,api:mock([docs[1],docs[0],docs[2]])}),/out-of-order|pagination order changed/);
await assert.rejects(loadCompleteClassRoster({...base,api:mock([docs[0],docs[2],docs[1]])}),/out-of-order|pagination order changed/);
await assert.rejects(loadCompleteClassRoster({...base,api:mock([docs[0],['s2',{schoolId:'87654321',class:'9'}]])}),/Cross-school/);
await assert.rejects(loadCompleteClassRoster({...base,pageSize:0,api:mock()}),/Page size/);
await assert.rejects(loadCompleteClassRoster({...base,pageSize:101,api:mock()}),/Page size/);
await assert.rejects(loadCompleteClassRoster({...base,pageSize:1.5,api:mock()}),/Page size/);
await assert.rejects(loadCompleteClassRoster({...base,maxStudents:0,api:mock()}),/Roster cap/);
await assert.rejects(loadCompleteClassRoster({...base,maxStudents:1501,api:mock()}),/Roster cap/);
await assert.rejects(loadCompleteClassRoster({...base,actor:{role:'viewer',active:true,schoolId:'87654321'},api:mock()}),/School membership/);
await assert.rejects(loadCompleteClassRoster({...base,classId:'99',api:mock()}),/Invalid class/);
// Verify the actual 1500-student supported boundary across multiple pages.
{
 const large=Array.from({length:1500},(_,i)=>['s'+String(i+1).padStart(4,'0'),{schoolId,class:'9',name:'Student '+(i+1)}]);
 const full=await loadCompleteClassRoster({...base,pageSize:100,api:mock(large)});
 assert.equal(full.count,1500);
 assert.equal(full.pages,15);
 assert.equal(new Set(full.studentIds).size,1500);
 assert.equal(full.studentIds[0],'s0001');
 assert.equal(full.studentIds.at(-1),'s1500');
 const overflow=[...large,['s1501',{schoolId,class:'9',name:'Extra Student'}]];
 await assert.rejects(loadCompleteClassRoster({...base,pageSize:100,api:mock(overflow)}),/exceeds 1500/);
}
// A session revoked or reassigned while a page is in flight must not return a usable roster.
for(const mutation of [
 a=>{a.active=false},
 a=>{a.role='viewer'},
 a=>{a.schoolId='87654321'},
 a=>{a.uid='other-user'}
]){
 const changingActor={role:'school_admin',active:true,schoolId,uid:'admin-1'};
 const api=mock();
 const getDocs=api.getDocs;
 let first=true;
 api.getDocs=async q=>{
  const result=await getDocs(q);
  if(first){first=false;mutation(changingActor)}
  return result;
 };
 await assert.rejects(loadCompleteClassRoster({...base,actor:changingActor,api}),/School membership changed/);
}
// Reject malformed snapshots and roster data without exposing partial pages.
for(const malformed of [null,undefined,{}]){
 const bad={...mock(),getDocs:async()=>malformed};
 await assert.rejects(loadCompleteClassRoster({...base,api:bad}),/Unexpected result size/);
}
for(const malformed of [null,undefined,[]]){
 const bad={...mock(),getDocs:async()=>({docs:[{id:'s1',data:()=>malformed}]})};
 await assert.rejects(loadCompleteClassRoster({...base,api:bad}),/Cross-school or wrong-class/);
}
let materializations=0;
const once={...mock(),getDocs:async()=>({docs:[{id:'s1',data:()=>{
 materializations++;
 return materializations===1?{schoolId,class:'9',name:'A'}:{schoolId:'99999999',class:'9'};
}}]})};
const stable=await loadCompleteClassRoster({...base,api:once});
assert.equal(materializations,1);
assert.equal(stable.count,1);
for(const mutation of [a=>{a.active=false},a=>{a.uid='other-user'},a=>{a.schoolId='99999999'},a=>{a.role='viewer'}]){
 const changingActor={...actor};
 const bad={...mock(),getDocs:async()=>({docs:[{id:'s1',data:()=>{
  mutation(changingActor);
  return {schoolId,class:'9',name:'A'};
 }}]})};
 await assert.rejects(loadCompleteClassRoster({...base,actor:changingActor,api:bad}),/membership changed/i);
}
for(const uid of [undefined,null,'','  ']){
 await assert.rejects(loadCompleteClassRoster({...base,actor:{...actor,uid},api:mock()}),/School membership required/);
}
// Verify no class roster is returned if the last page revokes the actor.
for(const mutation of [a=>{a.active=false},a=>{a.uid='other-user'},a=>{a.schoolId='99999999'}]){
 const changingActor={...actor};
 const original=mock();
 let calls=0;
 const lastPage={...original,getDocs:async q=>{
  const response=await original.getDocs(q);
  calls++;
  if(calls===2)mutation(changingActor);
  return response;
 }};
 await assert.rejects(loadCompleteClassRoster({...base,actor:changingActor,api:lastPage}),/membership changed/i);
 assert.equal(calls,2);
}
// All roster document accessors must be read exactly once, including the lookahead record.
{
 const counts=new Map();
 const rows=[['s1','A'],['s2','B'],['s3','C']];
 const original=mock();
 const oncePages={...original,getDocs:async q=>{
  const c=q.find(x=>x?.cursor)?.cursor;
  const start=c?rows.findIndex(([id])=>id===c)+1:0;
  return {docs:rows.slice(start,start+3).map(([id,name])=>({id,data:()=>{
   counts.set(id,(counts.get(id)??0)+1);
   return {schoolId,class:'9',name};
  }}))};
 }};
 const loaded=await loadCompleteClassRoster({...base,api:oncePages});
 assert.deepEqual(loaded.studentIds,['s1','s2','s3']);
 assert.equal(counts.get('s1'),1);
 assert.equal(counts.get('s2'),1);
 assert.equal(counts.get('s3'),2); // lookahead on page 1, then included on page 2
}
for(const doc of [null,undefined,{id:'s1'},{id:'s1',data:null},{id:'s1',data:123}]){
 const malformed={...mock(),getDocs:async()=>({docs:[doc]})};
 await assert.rejects(loadCompleteClassRoster({...base,api:malformed}),/Invalid or duplicate roster document ID|Malformed roster document/);
}
const {readFileSync}=await import('node:fs');
const attendanceUI=readFileSync(new URL('./attendance-console.mjs',import.meta.url),'utf8');
assert.match(attendanceUI,/result\.students\.filter\(isActiveEnrolledStudent\)/,
 'Attendance selection table excludes deactivated students before Save');
console.log('V47 complete class roster pagination and inactive student exclusion tests passed');
