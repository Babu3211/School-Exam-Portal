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
 'teacherAttendanceAllowed(sid, id);',
 "assignment.get('studentId','') == data.studentId",
 "assignment.get('subjectId','') == data.subjectId",
 "assignment.get('active',true) == true",
 'data.theory <= 100',
 'data.practical <= 100',
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
const marksBlock=rules.split('match /marks/{id} {')[1]?.split('function teacherAttendanceAllowed')[0]??'';
assert.match(marksBlock,/allow create, update, delete: if false;/,'Individual marks writes must remain blocked until audited publish');
assert.ok(!/allow (?:create|update):/.test(marksBlock),'No alternate individual mark write permissions');
const componentBlock=rules.split('match /component_marks/{id} {')[1]?.split('match /subjects/{id}')[0]??'';
assert.ok(componentBlock,'Computer component marks rule must exist');
assert.ok(componentBlock.includes('allow create: if false;'),'Computer component mark create must remain blocked');
assert.ok(componentBlock.includes('allow update, delete: if false;'),'Computer component mark update/delete must remain blocked');
// Check every allow clause, including combined permissions (create, update, delete).
// A second allow statement is OR-ed with the deny and can silently reopen writes.
function assertAllMarkWritesDenied(block,label){
 const clauses=[...block.matchAll(/allow\\s+([^:;]+):\\s*if\\s+([^;]+);/g)];
 assert.ok(clauses.length>0,label+' must declare permissions');
 for(const clause of clauses){
  const permissions=clause[1].split(',').map(x=>x.trim());
  if(permissions.some(x=>['write','create','update','delete'].includes(x)))
   assert.equal(clause[2].trim(),'false',label+' contains an alternate writable permission: '+clause[0]);
 }
}
assertAllMarkWritesDenied(marksBlock,'Raw marks');
assertAllMarkWritesDenied(componentBlock,'Computer component marks');
assert.equal(rules.split('match /subject_assignments/{id}').length-1,1,'Subject assignment block must occur exactly once');
assert.equal(rules.split('match /{collection}/{id}').length-1,1,'Generic collection rule must occur exactly once');
assert.equal(rules.split('match /{document=**}').length-1,1,'Default-deny tail must occur exactly once');
const assignmentBlock=rules.split('match /subject_assignments/{id} {')[1]?.split('match /{collection}/{id}')[0]??'';
for(const field of ['studentId','subjectId'])
 assert.ok(assignmentBlock.includes("data."+field+".matches('^[A-Za-z0-9_-]{1,128}$')"),'Truncated '+field+' regex');
assert.ok(rules.trimEnd().endsWith('}'));
assert.ok(!rules.includes('}\\n})'),'Malformed duplicate tail');
console.log('V47 structural school isolation checks passed; emulator tests still required');
