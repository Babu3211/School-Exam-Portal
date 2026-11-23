import assert from 'node:assert/strict';
import {saveAuthoritativeClassAttendance} from './verified-class-attendance-save.mjs';
const schoolId='12345678',classId='9',date='2026-11-18';
const actor={uid:'admin-1',active:true,role:'school_admin',schoolId};
const students=['s1','s2'];
let committed=0,staged=[];
const api={
 collection:(_db,...parts)=>parts.join('/'),
 query:(...args)=>args,
 where:(...args)=>args,
 orderBy:(...args)=>args,
 limit:(...args)=>args,
 getDocs:async()=>({docs:students.map(id=>({id,data:()=>({schoolId,class:classId})})),size:2,empty:false}),
 doc:(_db,...parts)=>parts.join('/'),
 getDoc:async()=>({exists:()=>true,data:()=>({schoolId,class:classId})}),
 writeBatch:()=>({set:(ref,val)=>staged.push([ref,val]),commit:async()=>{committed++}})
};
const entries=students.map(studentId=>({studentId,class:classId,date,present:true}));
await assert.rejects(saveAuthoritativeClassAttendance({db:{},api,actor,schoolId,classId,date,entries:entries.slice(0,1)}),/incomplete|roster|missing/i);
assert.equal(committed,0,'Incomplete selection must not commit');
console.log('Authoritative attendance save refuses incomplete roster');
