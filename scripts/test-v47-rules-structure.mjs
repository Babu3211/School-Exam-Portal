import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('../v47/firestore.rules',import.meta.url),'utf8');
assert.match(rules,/^rules_version = '2';/);
assert.equal(rules.split("rules_version = '2';").length-1,1);
assert.match(rules,/match \/schools\/\{sid\}/);
for(const fn of ['superAdmin()','activeSchool(sid)','activeMember(sid)','memberRole(sid, role)','canRead(sid)','canAdmin(sid)','immutableSchool(sid)','validRawMark(sid, id)','teacherMarkAllowed(sid, id)','teacherAttendanceAllowed(sid, id)']){
 assert.equal(rules.split('function '+fn).length-1,1,'Missing or duplicate '+fn);
}
for(const name of ['students','marks','attendance','exams','teacher_assignments']){
 assert.equal(rules.split('match /'+name+'/{id}').length-1,1,'Missing or duplicate '+name);
}
assert.match(rules,/match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
assert.match(rules,/function activeMember\(sid\)/);
assert.match(rules,/request\.auth\.uid/);
assert.match(rules,/get\(memberPath\(sid\)\)\.data\.get\('schoolId', ''\) == sid/);
assert.match(rules,/get\(memberPath\(sid\)\)\.data\.get\('active', false\) == true/);
assert.match(rules,/request\.resource\.data\.schoolId == sid/);
assert.match(rules,/request\.resource\.data\.theory <= 100/);
assert.match(rules,/request\.resource\.data\.practical <= 100/);
assert.match(rules,/teacherMarkAllowed\(sid, id\)/);
assert.match(rules,/teacherAttendanceAllowed\(sid, id\)/);
assert.match(rules,/allow delete: if false;/);
assert.ok(rules.length<30000,'Unexpected rules expansion');
assert.ok(rules.trimEnd().endsWith('}'),'Rules missing final closing brace');
console.log('V47 current Firestore rules structural contract passed; emulator authorization remains mandatory');
