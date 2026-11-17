import assert from 'node:assert/strict';
import { assertSchoolId, schoolCollectionPath, schoolDocumentPath, schoolMembershipPath } from './school-scope.mjs';
assert.equal(assertSchoolId('smss-001'), 'smss-001');
assert.equal(schoolCollectionPath('smss-001', 'students'), 'schools/smss-001/students');
assert.equal(schoolDocumentPath('smss-001', 'marks', 'mark_001'), 'schools/smss-001/marks/mark_001');
assert.equal(schoolMembershipPath('smss-001', 'uid_001'), 'schools/smss-001/members/uid_001');
assert.equal(schoolMembershipPath('smss-001', 'u'.repeat(128)), 'schools/smss-001/members/'+'u'.repeat(128));
assert.throws(()=>schoolMembershipPath('smss-001','u'.repeat(129)),TypeError);
for (const bad of ['', '../other', 'school/id', 'school id', '.', 'x'.repeat(65), null]) {
  assert.throws(() => assertSchoolId(bad), TypeError);
}
for (const bad of ['', '../students', 'students/other', 'with space', '__', null]) {
  assert.throws(() => schoolCollectionPath('smss-001', bad), TypeError);
}
for (const bad of ['', '../x', 'a/b', null]) {
  assert.throws(() => schoolDocumentPath('smss-001', 'students', bad), TypeError);
}
assert.notEqual(schoolCollectionPath('schoolA', 'students'), schoolCollectionPath('schoolB', 'students'));
console.log('V47 school scope helper tests passed');
