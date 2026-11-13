import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the real class-normalization function from the shipped portal,
// rather than a second test-only implementation that might drift.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('function canonicalStudentClass(value){');
assert.ok(start >= 0, 'Class normalization helper must exist');
const end = html.indexOf('\nconst subjectEnglishNames=', start);
assert.ok(end > start, 'Class normalization helper boundary must exist');
const source = html.slice(start, end);
const canonical = vm.runInNewContext(source + '\ncanonicalStudentClass;', Object.create(null));

for (let n = 1; n <= 12; n++) {
  const expected = `कक्षा ${n}`;
  const nepali = String(n).replace(/[0-9]/g, digit => '०१२३४५६७८९'[Number(digit)]);
  for (const input of [`Class ${n}`, `class ${n}`, `कक्षा ${n}`, `कक्षा ${nepali}`, String(n)]) {
    assert.equal(canonical(input), expected, `Assignment/student class mismatch for ${input}`);
  }
}
for (const input of ['ECD', 'ecd', 'Early Childhood Development']) {
  assert.equal(canonical(input), 'ECD', `ECD normalization failed for ${input}`);
}
assert.notEqual(canonical('Class 11'), canonical('Class 9'), 'Upper classes must remain distinct');
assert.notEqual(canonical('Class 12'), canonical('Class 10'), 'Upper classes must remain distinct');
console.log('V46 Teacher/student class normalization regression passed for ECD and Classes 1–12.');
