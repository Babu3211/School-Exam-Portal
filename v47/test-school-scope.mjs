import assert from 'node:assert/strict';
import { assertSchoolId, schoolCollectionPath, schoolDocumentPath, schoolMembershipPath } from './school-scope.mjs';
assert.equal(assertSchoolId('12345678'), '12345678');
assert.equal(schoolCollectionPath('12345678', 'students'), 'schools/12345678/students');
assert.equal(schoolDocumentPath('12345678', 'marks', 'mark_001'), 'schools/12345678/marks/mark_001');
assert.equal(schoolMembershipPath('12345678', 'uid_001'), 'schools/12345678/members/uid_001');
assert.equal(schoolMembershipPath('12345678', 'u'.repeat(128)), 'schools/12345678/members/'+'u'.repeat(128));
assert.throws(()=>schoolMembershipPath('12345678','u'.repeat(129)),TypeError);
for (const bad of ['', '../other', 'school/id', 'school id', '.', 'x'.repeat(65), null]) {
  assert.throws(() => assertSchoolId(bad));
}
for (const bad of ['', '../students', 'students/other', 'with space', '__', null]) {
  assert.throws(() => schoolCollectionPath('12345678', bad), TypeError);
}
for (const bad of ['', '../x', 'a/b', null]) {
  assert.throws(() => schoolDocumentPath('12345678', 'students', bad), TypeError);
}
assert.notEqual(schoolCollectionPath('12345678', 'students'), schoolCollectionPath('87654321', 'students'));
console.log('V47 school scope helper tests passed');
