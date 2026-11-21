import assert from 'node:assert/strict';
import {validateCompleteClassAttendance} from './class-attendance-completeness.mjs';
const base={schoolId:'12345678',classId:'9',date:'2026-11-18',expectedStudentIds:['s1','s2']};
const item=(studentId,extra={})=>({studentId,class:'9',date:base.date,present:true,...extra});
assert.equal(validateCompleteClassAttendance({...base,entries:[item('s2'),item('s1')]}).count,2);
for(const [change,pattern] of [
 [{entries:[item('s1')]},/incomplete/],
 [{entries:[]},/incomplete/],
 [{entries:[item('s1'),item('s1')]},/Duplicate student attendance/],
 [{entries:[item('s1'),item('s3')]},/not in selected/],
 [{entries:[item('s1'),item('s2',{class:'8'})]},/Mixed class/],
 [{entries:[item('s1'),item('s2',{date:'2026-11-17'})]},/Mixed class/],
 [{entries:[item('s1'),item('s2',{present:null})]},/Present must/],
 [{expectedStudentIds:['s1','s1'],entries:[item('s1')]},/duplicate roster/],
 [{expectedStudentIds:[],entries:[]},/Valid class roster/],
 [{schoolId:'../other',entries:[item('s1'),item('s2')]},/School ID must be an IEMIS number string|Invalid school ID/],
 [{expectedStudentIds:Array.from({length:1501},(_,i)=>'s'+i),entries:[]},/Valid class roster/],
 [{entries:Array.from({length:1501},(_,i)=>item('s'+i))},/Valid attendance entries/]
 ])assert.throws(()=>validateCompleteClassAttendance({...base,...change}),pattern);
// The 1,500-student upper bound is inclusive, and the complete roster
// may arrive in any order without losing any student's attendance.
{
 const expectedStudentIds=Array.from({length:1500},(_,i)=>'s'+i);
 const entries=expectedStudentIds.map(studentId=>item(studentId)).reverse();
 const complete=validateCompleteClassAttendance({...base,expectedStudentIds,entries});
 assert.equal(complete.count,1500);
 assert.equal(complete.entries[0].studentId,'s1499');
 assert.equal(complete.entries.at(-1).studentId,'s0');
}
console.log('V47 class attendance completeness checks passed');
