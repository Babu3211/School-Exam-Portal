import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// V47 release blocker: this test intentionally fails while legacy root-level
// collections remain accessible without a school-scoped authorization check.
// Do not weaken the assertions to make CI green. V46 production is untouched.
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const protectedCollections = ['students', 'staff', 'classes', 'subjects', 'exams', 'marks', 'attendance'];
const unscoped = protectedCollections.filter(name =>
  new RegExp('match\\s+/' + name + '/\\{[^}]+\\}').test(rules)
);
assert.deepEqual(unscoped, [],
  'V47 must not expose legacy root collections through unscoped rules: ' + unscoped.join(', '));
assert.match(rules, /match\\s+\\/schools\\/\\{schoolId\\}/,
  'V47 needs a school-scoped Firestore path and explicit membership checks');
console.log('V47 school isolation structural gate passed. Run emulator cross-school tests before release.');
