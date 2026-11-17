import assert from 'node:assert/strict';
import {assignmentRecord,assignmentKey} from './teacher-assignment.mjs';
const args={schoolId:'schoolA',uid:'teacher1',classId:'9',subjectId:'computer'};
assert.equal(assignmentKey(args),'schoolA:teacher1:9:computer');
assert.equal(assignmentRecord(args).active,false);
assert.throws(()=>assignmentRecord({...args,classId:'13'}));
assert.throws(()=>assignmentRecord({...args,schoolId:'../schoolB'}));
console.log('V47 assignment validation tests passed');
