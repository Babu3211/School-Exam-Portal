import assert from 'node:assert/strict';
import {saveVerifiedClassAttendance} from './verified-class-attendance-save.mjs';
const schoolId='school-a',classId='9',date='2026-11-18',actor={role:'school_admin',active:true,schoolId};
const entry=(studentId,present=true)=>({studentId,class:classId,date,present});
const args={schoolId,classId,date,actor,expectedStudentIds:['s1','s2'],entries:[entry('s1'),entry('s2',false)]};
let committed=[];
const api={doc:(_db,...parts)=>parts.join('/'),writeBatch:()=>({
 set:(ref,value)=>committed.push([ref,value]),
 commit:async()=>{}
})};
const result=await saveVerifiedClassAttendance({...args,db:{},api});
assert.equal(result.saved,2);
assert.equal(committed.length,2);
assert.equal(committed[0][1].schoolId,schoolId);
for(const [change,pattern] of [
 [{entries:[entry('s1')]},/incomplete/],
 [{entries:[entry('s1'),entry('s1')]},/Duplicate/],
 [{entries:[entry('s1'),entry('s3')]},/not in selected/],
 [{actor:{role:'viewer',active:true,schoolId}},/School Admin/],
 [{actor:{role:'school_admin',active:true,schoolId:'school-b'}},/School Admin/]
 ]){
 committed=[];
 await assert.rejects(saveVerifiedClassAttendance({...args,...change,db:{},api}),pattern);
 assert.equal(committed.length,0);
}
console.log('V47 verified attendance save contract checks passed');
