import assert from 'node:assert/strict';
import {planCompleteClassMarkStaging} from './class-mark-staging-plan.mjs';
const schoolId='12345678',classId='9',term='final',subjectId='computer';
const ids=Array.from({length:1500},(_,i)=>'student_'+String(i+1).padStart(4,'0'));
const entries=ids.map(studentId=>({studentId,class:classId,term,subjectId,theory:27,practical:33})).reverse();
const subjectSettings={schoolId,class:classId,active:true,theoryFullMarks:40,practicalFullMarks:60};
const base={schoolId,classId,term,subjectId,expectedStudentIds:ids,entries,subjectSettings};
const plan=planCompleteClassMarkStaging(base);
assert.equal(plan.studentCount,1500);
assert.equal(plan.chunkCount,8);
assert.equal(plan.chunks[0].firstStudentId,ids[0]);
assert.equal(plan.chunks.at(-1).lastStudentId,ids.at(-1));
assert.equal(plan.chunks[0].lastStudentId,ids[199]);
assert.equal(plan.chunks[1].firstStudentId,ids[200]);
assert.deepEqual(plan.chunks.map(x=>x.count),[200,200,200,200,200,200,200,100]);
assert.deepEqual(plan.chunks.flatMap(x=>x.rows.map(r=>r.studentId)),ids);
assert.equal(plan.canPublish,false);
assert.equal(plan.diagnosticOnly,true);
assert(Object.isFrozen(plan.chunks));
const shuffled=planCompleteClassMarkStaging({...base,entries:[...entries].reverse()});
assert.deepEqual(shuffled.chunks.flatMap(x=>x.rows.map(r=>r.studentId)),ids);
for(const [label,changes,pattern] of [
 ['incomplete',{entries:entries.slice(1)},/Cannot save/],
 ['duplicate',{entries:[...entries.slice(1),entries[1]]},/Duplicate student/],
 ['foreign student',{entries:entries.map((e,i)=>i===0?{...e,studentId:'foreign'}:e)},/not in selected/],
 ['wrong school settings',{subjectSettings:{...subjectSettings,schoolId:'87654321'}},/Active subject/],
 ['inactive subject',{subjectSettings:{...subjectSettings,active:false}},/Active subject/],
 ['invalid max',{subjectSettings:{...subjectSettings,theoryFullMarks:20}},/exceed/],
 ['components',{subjectSettings:{...subjectSettings,components:[{key:'theory',fullMarks:40}]}},/Component assessment/],
 ['bad chunk',{chunkSize:201},/chunk size/]
]){
 assert.throws(()=>planCompleteClassMarkStaging({...base,...changes}),pattern,label);
}
console.log('V47 1500-student deterministic staging plan validation passed');
