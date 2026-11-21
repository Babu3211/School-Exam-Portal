import assert from 'node:assert/strict';
import {planLargeClassMarks} from './large-class-mark-plan.mjs';
const schoolId='12345678',classId='9',term='monthly',subjectId='math';
const actor={active:true,role:'school_admin',schoolId};
function fixture(n){
 const expectedStudentIds=Array.from({length:n},(_,i)=>'s'+i);
 const entries=expectedStudentIds.map(studentId=>({studentId,class:classId,term,subjectId,theory:0,practical:0}));
 return {actor,schoolId,classId,term,subjectId,expectedStudentIds,entries};
}
for(const n of [1,2,3,4,30,300,500,1000,1500]){
 const plan=planLargeClassMarks(fixture(n));
 assert.equal(plan.studentCount,n);
 assert.equal(plan.groupCount,Math.ceil(n/3));
 assert.equal(plan.groups.flat().length,n);
 assert.equal(new Set(plan.groups.flat().map(item=>item.markId)).size,n);
 assert.ok(plan.groups.every(group=>group.length>=1&&group.length<=3));
 assert.equal(plan.writeAuthorized,false);
 assert.equal(plan.readyForServerReview,true);
 assert.ok(Object.isFrozen(plan));
}
for(const bad of [
 {...fixture(4),entries:fixture(4).entries.slice(1)},
 {...fixture(4),entries:[...fixture(4).entries.slice(0,3),fixture(4).entries[0]]},
 {...fixture(4),actor:{active:true,role:'viewer',schoolId}},
 {...fixture(4),actor:{active:true,role:'teacher',schoolId}},
 {...fixture(4),actor:{active:true,role:'super_admin'}},
 {...fixture(4),actor:{active:false,role:'school_admin',schoolId}},
 {...fixture(4),actor:{active:true,role:'school_admin',schoolId:'87654321'}},
])assert.throws(()=>planLargeClassMarks(bad));
assert.throws(()=>planLargeClassMarks(fixture(1501)),/Class roster required/);
console.log('V47 large-class read-only mark plan checks passed');
