import assert from 'node:assert/strict';
import {loadClassRoster} from './attendance-roster.mjs';
const schoolId='school-a',schoolClass='9',actor={role:'school_admin',active:true,schoolId};
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
 {schoolId:'school-b',class:'9'},
 {schoolId,class:'8'},
 {class:'9'}
]){
 await assert.rejects(loadClassRoster({...base,api:apiFor([['s1',data]])}),/Cross-school or wrong-class/);
}
await assert.rejects(loadClassRoster({...base,actor:{role:'viewer',active:true,schoolId:'school-b'},api:apiFor(students)}),/School membership/);
console.log('V47 roster query isolation tests passed');
