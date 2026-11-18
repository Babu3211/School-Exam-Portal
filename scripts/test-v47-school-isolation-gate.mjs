import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('../v47/firestore.rules',import.meta.url),'utf8');
assert.ok(rules.startsWith("rules_version = '2';"));
assert.ok(rules.includes('match /schools/{sid}'));
for(const name of ['students','marks','attendance','exams','teacher_assignments']){
 const token='match /'+name+'/{id}';
 assert.equal(rules.split(token).length-1,1,'Missing or duplicated '+name+' rules');
 assert.ok(rules.indexOf(token)>rules.indexOf('match /schools/{sid}'),'Unscoped '+name);
}
for(const token of [
 'function activeMember(sid)','function memberRole(sid, role)',
 'function immutableSchool(sid)','function validStudent()',
 'function teacherMarkAllowed(sid, id)','function validRawMark(sid, id)',
 'function teacherAttendanceAllowed(sid, id)',
 'match /{document=**} { allow read, write: if false; }',
 "request.resource.data.subjectId.matches('^[A-Za-z0-9_-]{1,128}$')",
 "subjectAssignment.get('active', true) == true",
 'teacherMarkAllowed(sid, id);','teacherAttendanceAllowed(sid, id);',
 'canAdmin(sid) && validRawMark(sid, id)',
 'request.resource.data.theory <= 100',
 'request.resource.data.practical <= 100',
 'request.resource.data.present is bool',
 "request.resource.data.date.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')",
 "request.resource.data.class + ':attendance'"
])assert.ok(rules.includes(token),'Missing or truncated '+token);
for(const token of [
 'function teacherMarkAllowed(sid, id)','function validRawMark(sid, id)',
 'function teacherAttendanceAllowed(sid, id)','match /{document=**}'
])assert.equal(rules.split(token).length-1,1,'Duplicate '+token);
assert.equal(rules.split("rules_version = '2';").length-1,1,'Duplicated Firestore rules file');
assert.equal(rules.split('match /exams/{id}').length-1,1,'Duplicated exam rule');
assert.equal(rules.split('match /attendance/{id}').length-1,1,'Duplicated attendance rule');
assert.ok(!rules.includes("matches('^[A-Za-z0-9_-]{1,128}\\n"),'Truncated regex');
assert.ok(!rules.includes("matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}\\n"),'Truncated date regex');
assert.ok(rules.trimEnd().endsWith('}'));
assert.ok(!rules.includes('}\n})'),'Malformed duplicate tail');
console.log('V47 structural school isolation checks passed; emulator tests still required');
