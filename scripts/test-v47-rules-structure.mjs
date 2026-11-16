import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('../v47/firestore.rules',import.meta.url),'utf8');
assert.match(rules,/match \/schools\/\{schoolId\}/);
assert.match(rules,/function membershipPath\(schoolId\)/);
assert.match(rules,/function superAdmin\(\)/);
assert.match(rules,/match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
for(const name of ['students','staff','classes','subjects','exams','marks','attendance'])assert.ok(name==='students'?rules.includes('match /students/{docId}'):rules.includes("'"+name+"'"));
console.log('V47 separate Firestore rules structure checked (not a security emulator substitute)');
