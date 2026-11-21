import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
assert.match(rules,/sid\.matches\('\^\[0-9\]\{5,20\}\$'\)/);
assert.doesNotMatch(rules,/sid\.matches\('\^\[0-9\]\{5,20\}\s*\n/);
assert.match(rules,/function validSchool\(sid\)/);
console.log('PASS: V47 school IEMIS rule pattern is complete');
