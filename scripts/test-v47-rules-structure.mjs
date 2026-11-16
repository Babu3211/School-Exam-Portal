import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('../v47/firestore.rules',import.meta.url),'utf8');
assert.match(rules,/match \/schools\/\{schoolId\}/);
assert.match(rules,/function membershipPath\(schoolId\)/);
assert.match(rules,/function superAdmin\(\)/);
assert.match(rules,/match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
for(const name of ['students','staff','classes','subjects','exams','marks','attendance']){
 if(['students','attendance'].includes(name))assert.ok(rules.includes('match /'+name+'/{docId}'));
 else assert.ok(rules.includes("'"+name+"'"));
}
assert.match(rules,/allow create: if schoolAdmin\(schoolId\) && validNewStudent\(\)/);
const wildcard=rules.match(/match \/\{collection\}\/\{docId\} \{([\s\S]*?)\n   \}/)?.[1];
assert.ok(wildcard,'Missing generic scoped rule');
assert.doesNotMatch(wildcard,/'students'|'attendance'/,'Wildcard bypasses validated collections');
assert.ok(rules.includes("date.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')"));
assert.ok(rules.includes("studentId.matches('^[A-Za-z0-9_-]{1,128}$')"));
for(const pattern of [/match \/\{collection\}\/\{docId\}/g,/function validAttendance\(docId\)/g,/match \/attendance\/\{docId\}/g])assert.equal((rules.match(pattern)||[]).length,1);
assert.ok(rules.includes("students/$(request.resource.data.studentId)"),'Attendance must refer to a school-scoped student');
assert.ok(rules.includes(".data['class'] == request.resource.data['class']"),'Attendance must match student class');
console.log('V47 Firestore rules structural checks passed; emulator still required');
