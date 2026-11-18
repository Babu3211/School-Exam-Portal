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
  return {docs:rows.slice(offset,offset+3).map(([id,data])=>({id,data:()=>data}))};
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
console.log('V47 complete class roster pagination tests passed');
