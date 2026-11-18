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
assert.match(rules, /id\.matches\('\^\[A-Za-z0-9_-\]\{1,128\}\
console.log('V47 school isolation structural gate passed; emulator authorization tests still required');
\)/, 'Student ID regex must be complete');
assert.equal((rules.match(/match \/\{document=\*\*\}/g)||[]).length,1,'Only one catch-all deny block allowed');
assert.ok(rules.trimEnd().endsWith('}'),'Rules must end with closing brace');
assert.doesNotMatch(rules, /\n\}\)\n/, 'Invalid duplicate tail');
console.log('V47 school isolation structural gate passed; emulator authorization tests still required');
