import assert from 'node:assert/strict';import {validateSubjectAssignment,subjectAssignmentId} from '../v47/subject-assignment-validation.mjs';
const a={studentId:'s1',subjectId:'math_6',class:'6'};
assert.equal(subjectAssignmentId(a),'s1:math_6');assert.deepEqual(validateSubjectAssignment(a),a);
for(const bad of [{...a,studentId:'s/1'},{...a,subjectId:'x/y'},{...a,class:'13'},null])assert.throws(()=>validateSubjectAssignment(bad));
assert.notEqual(subjectAssignmentId({studentId:'a_b',subjectId:'c',class:'6'}),subjectAssignmentId({studentId:'a',subjectId:'b_c',class:'6'}),'Colon identity prevents underscore collisions');
console.log('V47 subject assignment validation passed');
