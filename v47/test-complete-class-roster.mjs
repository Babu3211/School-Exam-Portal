import assert from 'node:assert/strict';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
const schoolId='school-a',actor={role:'school_admin',active:true,schoolId},classId='9';
const base={db:{},actor,schoolId,classId,pageSize:2};
const docs=[['s1',{schoolId,class:'9',name:'A'}],['s2',{schoolId,class:'9',name:'B'}],['s3',{schoolId,class:'9',name:'C'}]];
function mock(rows=docs){
 return {collection:(_db,...p)=>p.join('/'),where:(...a)=>a,orderBy:x=>x,limit:x=>x,startAfter:cursor=>({cursor}),
 query:(...a)=>a,getDocs:async q=>{
  const c=q.find(x=>x?.cursor)?.cursor;
  const offset=c?rows.findIndex(x=>x[0]===c.id)+1:0;
  const limit=Number(q.find(x=>typeof x==='number')??3);
  return {docs:rows.slice(offset,offset+limit).map(([id,data])=>({id,data:()=>data}))};
 }};
}
const result=await loadCompleteClassRoster({...base,api:mock()});
assert.deepEqual(result.studentIds,['s1','s2','s3']);
assert.equal(result.count,3);
assert.equal(result.pages,2);
await assert.rejects(loadCompleteClassRoster({...base,api:mock(),maxStudents:2}),/exceeds 2/);
await assert.rejects(loadCompleteClassRoster({...base,api:mock([])}),/no students/);
await assert.rejects(loadCompleteClassRoster({...base,api:mock([docs[0],docs[0],docs[2]])}),/duplicate roster document ID|Duplicate student/);
await assert.rejects(loadCompleteClassRoster({...base,api:mock([docs[0],['s2',{schoolId:'school-b',class:'9'}]])}),/Cross-school/);
await assert.rejects(loadCompleteClassRoster({...base,maxStudents:0,api:mock()}),/Roster cap/);
await assert.rejects(loadCompleteClassRoster({...base,maxStudents:1501,api:mock()}),/Roster cap/);
await assert.rejects(loadCompleteClassRoster({...base,actor:{role:'viewer',active:true,schoolId:'school-b'},api:mock()}),/School membership/);
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
console.log('V47 complete class roster pagination tests passed');
