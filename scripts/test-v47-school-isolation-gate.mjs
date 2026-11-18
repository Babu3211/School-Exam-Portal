import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Structural checks only. Firestore Emulator permission tests are required separately.
const rules = readFileSync(new URL('../v47/firestore.rules', import.meta.url), 'utf8');
for (const name of ['students', 'staff', 'classes', 'subjects', 'exams', 'marks', 'attendance']) {
  assert.doesNotMatch(rules, new RegExp('^\\s{0,4}match /' + name + '/\\{', 'm'), 'Unscoped top-level collection: ' + name);
}
for (const name of ['students', 'marks', 'attendance', 'exams']) {
  assert.equal((rules.match(new RegExp('match /' + name + '/\\{id\\}', 'g')) || []).length, 1, 'Expected one scoped match for ' + name);
}
assert.match(rules, /match \/schools\/\{sid\}/);
assert.match(rules, /function activeMember\(sid\)/);
assert.match(rules, /function memberRole\(sid, role\)/);
assert.match(rules, /function immutableSchool\(sid\)/);
assert.match(rules, /match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
assert.doesNotMatch(rules, /match \/user_roles\//);
assert.doesNotMatch(rules, /^\)\s*$/m, 'Stray closing parenthesis');
console.log('V47 school isolation structural gate passed; emulator authorization tests still required');
