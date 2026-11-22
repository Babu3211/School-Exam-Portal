import assert from 'node:assert/strict';
import {verifyClassMarksCoverage} from './class-marks-coverage.mjs';
// Scale regression: 1500 students x 20 subjects, no database writes.
const schoolClass='9',term='final';
const students=Array.from({length:1500},(_,i)=>({id:'student_'+i,class:schoolClass,active:true}));
const subjects=Array.from({length:20},(_,i)=>({id:'subject_'+i,class:schoolClass,active:true}));
const records=students.flatMap(student=>subjects.map(subject=>({studentId:student.id,subjectId:subject.id,class:schoolClass,term})));
const args={students,subjects,records,schoolClass,term};
assert.deepEqual(verifyClassMarksCoverage(args),{complete:true,studentCount:1500,subjectCount:20,recordCount:30000});
assert.throws(()=>verifyClassMarksCoverage({...args,records:records.slice(0,-1)}),/Incomplete class marks/);
assert.throws(()=>verifyClassMarksCoverage({...args,records:[...records.slice(0,-1),records[0]]}),/Duplicate marks/);
assert.throws(()=>verifyClassMarksCoverage({...args,hasMore:true}),/All marks pages/);
console.log('V47 1500-student 20-subject coverage scale checks passed');
