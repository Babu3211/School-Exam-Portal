import assert from 'node:assert/strict';import {validateSubjectAssignment,subjectAssignmentId} from '../v47/subject-assignment-validation.mjs';
const a={studentId:'s1',subjectId:'math_6',class:'6'};
assert.equal(subjectAssignmentId(a),'s1_math_6');assert.deepEqual(validateSubjectAssignment(a),a);
for(const bad of [{...a,studentId:'s/1'},{...a,subjectId:'x/y'},{...a,class:'13'},null])assert.throws(()=>validateSubjectAssignment(bad));
console.log('V47 subject assignment validation passed');
