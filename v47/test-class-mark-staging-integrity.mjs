import assert from 'node:assert/strict';
import {planCompleteClassMarkStaging} from './class-mark-staging-plan.mjs';
import {verifyClassMarkStagingPlan} from './class-mark-staging-integrity.mjs';
const schoolId='12345678',classId='9',term='final',subjectId='computer';
const ids=Array.from({length:1500},(_,i)=>'s'+String(i+1).padStart(4,'0'));
const entries=ids.map(studentId=>({studentId,class:classId,term,subjectId,theory:20,practical:30}));
const settings={schoolId,class:classId,active:true,creditHour:2,theoryFullMarks:40,practicalFullMarks:60};
const plan=planCompleteClassMarkStaging({schoolId,classId,term,subjectId,expectedStudentIds:ids,entries,subjectSettings:settings});
assert.deepEqual(verifyClassMarkStagingPlan(plan),{valid:true,studentCount:1500,chunkCount:8,diagnosticOnly:true,canPublish:false});
const clone=()=>structuredClone(plan);
for(const [label,mutate] of [
 ['missing chunk',p=>p.chunks.pop()],
 ['incorrect count',p=>p.studentCount--],
 ['missing row',p=>p.chunks[0].rows.pop()],
 ['wrong offset',p=>p.chunks[1].offset++],
 ['duplicate ID',p=>p.chunks[1].rows[0].studentId=p.chunks[0].rows[0].studentId],
 ['foreign school',p=>p.chunks[2].rows[0].schoolId='87654321'],
 ['wrong subject',p=>p.chunks[2].rows[0].subjectId='math'],
 ['negative mark',p=>p.chunks[0].rows[0].theory=-1],
 ['false publication flag',p=>p.canPublish=true],
 ['wrong boundary',p=>p.chunks[0].lastStudentId='forged']
]){
 const modified=clone();mutate(modified);
 assert.throws(()=>verifyClassMarkStagingPlan(modified),undefined,label);
}
console.log('V47 staging manifest continuity and tamper checks passed');
