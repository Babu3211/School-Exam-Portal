import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('../v47/firestore.rules',import.meta.url),'utf8');
assert.ok(rules.startsWith("rules_version = '2';"),'Missing Firestore rules header');
assert.ok(rules.includes('match /schools/{sid}'),'Missing tenant scope');
for(const name of ['students','marks','attendance','exams','teacher_assignments']){
 const token='match /'+name+'/{id}';
 assert.equal(rules.split(token).length-1,1,'Missing or duplicated '+name+' rules');
 assert.ok(rules.indexOf(token)>rules.indexOf('match /schools/{sid}'),'Unscoped '+name);
}
for(const token of [
 'function activeMember(sid)','function memberRole(sid, role)',
 'function immutableSchool(sid)','function validStudent()',
 'function teacherMarkAllowed(sid, id)','function validRawMark(sid, id)','function teacherAttendanceAllowed(sid, id)',
 'match /{document=**} { allow read, write: if false; }',
 "request.resource.data.subjectId.matches('^[A-Za-z0-9_-]{1,128}$')",
 "data.get('active', true) == true",
 'teacherMarkAllowed(sid, id);','teacherAttendanceAllowed(sid, id);'
])assert.ok(rules.includes(token),'Missing or truncated '+token);
assert.ok(rules.includes("canAdmin(sid) && validRawMark(sid, id)"),'Admin mark writes must validate schema');
assert.ok(rules.includes("request.resource.data.theory <= 100"),'Admin mark theory upper bound missing');
assert.ok(rules.includes("request.resource.data.practical <= 100"),'Admin mark practical upper bound missing');
assert.equal(rules.split('function teacherMarkAllowed(sid, id)').length-1,1,'Duplicate teacher mark validator');
assert.equal(rules.split('function teacherAttendanceAllowed(sid, id)').length-1,1,'Duplicate teacher attendance validator');
assert.ok(rules.includes("request.resource.data.present is bool"),'Teacher attendance present must be boolean');
assert.ok(rules.includes("request.resource.data.date.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}
assert.equal(rules.split('match /{document=**}').length-1,1,'Duplicate deny-all catch-all');
assert.ok(rules.trimEnd().endsWith('}'),'Rules missing closing brace');
assert.ok(!rules.includes('}\n})'),'Malformed duplicate tail');
console.log('V47 structural school isolation checks passed; emulator tests still required');
)"),'Teacher attendance date shape missing');
assert.ok(rules.includes("request.resource.data.class + ':attendance'"),'Dedicated teacher class attendance assignment missing');

assert.equal(rules.split('match /{document=**}').length-1,1,'Duplicate deny-all catch-all');
assert.ok(rules.trimEnd().endsWith('}'),'Rules missing closing brace');
assert.ok(!rules.includes('}\n})'),'Malformed duplicate tail');
console.log('V47 structural school isolation checks passed; emulator tests still required');
