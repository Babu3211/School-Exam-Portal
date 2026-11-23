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
 startAfter:(...args)=>args,
 getDocs:async()=>({docs:students.map(id=>({id,data:()=>({schoolId,class:classId})})),size:2,empty:false}),
 doc:(_db,...parts)=>parts.join('/'),
 getDoc:async()=>({exists:()=>true,data:()=>({schoolId,class:classId})}),
 writeBatch:()=>({set:(ref,val)=>staged.push([ref,val]),commit:async()=>{committed++}})
};
const entries=students.map(studentId=>({studentId,class:classId,date,present:true}));
await assert.rejects(saveAuthoritativeClassAttendance({db:{},api,actor,schoolId,classId,date,entries:entries.slice(0,1)}),/incomplete|roster|missing/i);
assert.equal(committed,0,'Incomplete selection must not commit');
const success=await saveAuthoritativeClassAttendance({db:{},api,actor,schoolId,classId,date,entries});
assert.equal(success.saved,2);
assert.equal(committed,1,'Complete class must commit in one batch for <=10 students');
assert.equal(staged.length,2);
assert.ok(staged.every(([,value])=>value.schoolId===schoolId));
const otherSchool={...actor,schoolId:'87654321'};
await assert.rejects(saveAuthoritativeClassAttendance({db:{},api,actor:otherSchool,schoolId,classId,date,entries}),/School Admin|School membership|permission/i);
assert.equal(committed,1,'Cross-school identity must never commit');
console.log('Authoritative attendance: incomplete rejected, complete atomic small-class save, cross-school blocked');
