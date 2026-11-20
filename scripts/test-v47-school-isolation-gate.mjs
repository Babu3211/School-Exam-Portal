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
// A school suspension must revoke every member role, while preserving
// super-admin oversight. Mutation checks prevent accidental bypasses.
const activeMemberBlock=rules.split('function activeMember(sid) {')[1]?.split('\n    }')[0]??'';
assert.ok(activeMemberBlock.includes('activeSchool(sid)'), 'Active membership must require an active school');
assert.ok(activeMemberBlock.includes("get(memberPath(sid)).data.get('active', false) == true"),'Member must be active');
assert.ok(activeMemberBlock.includes("get(memberPath(sid)).data.get('schoolId', '') == sid"),'Member must belong to requested school');
// All school-scoped role grants must inherit activeMember's school-status,
// membership-active and UID checks. Otherwise suspension could be bypassed
// by a direct role lookup even while read access is correctly denied.
const memberRoleBlock=rules.match(/function memberRole\(sid, role\) \{([\s\S]*?)\n    \}/)?.[1]??'';
assert.ok(memberRoleBlock.includes('activeMember(sid)'), 'Role grants must require active school membership');
assert.ok(memberRoleBlock.includes("get(memberPath(sid)).data.get('role', '') == role"), 'Role grants must match the requested role');
for(const mutation of [
 memberRoleBlock.replace('activeMember(sid)', 'true'),
 memberRoleBlock.replace("get(memberPath(sid)).data.get('role', '') == role", 'true')
]){
 assert.ok(mutation!==memberRoleBlock, 'Role mutation must alter the original rule');
 assert.ok(!(mutation.includes('activeMember(sid)') &&
   mutation.includes("get(memberPath(sid)).data.get('role', '') == role")),
   'Mutated role grant must fail the membership/role assertions');
}
const canReadBlock=rules.match(/function canRead\(sid\) \{ return ([^;]+); \}/)?.[1]??'';
assert.equal(canReadBlock.trim(),'superAdmin() || activeMember(sid)','Read permission must not bypass active membership');
for(const mutation of [
 activeMemberBlock.replace('activeSchool(sid)','true'),
 activeMemberBlock.replace("get(memberPath(sid)).data.get('active', false) == true",'true'),
 activeMemberBlock.replace("get(memberPath(sid)).data.get('schoolId', '') == sid",'true')
]){
 assert.ok(mutation!==activeMemberBlock,'Security mutation must change member policy');
 assert.ok(!(
  mutation.includes('activeSchool(sid)')
  && mutation.includes("get(memberPath(sid)).data.get('active', false) == true")
  && mutation.includes("get(memberPath(sid)).data.get('schoolId', '') == sid")
 ),'Mutated membership must fail active-school/identity checks');
}
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
 const clauses=[...block.matchAll(/allow\s+([^:;]+):\s*if\s+([^;]+);/g)];
 const writeClauses=clauses.filter(clause=>clause[1].split(',').map(x=>x.trim()).some(x=>['write','create','update','delete'].includes(x)));
 assert.ok(writeClauses.length>0,label+' must explicitly deny write permissions');
 for(const clause of clauses){
  const permissions=clause[1].split(',').map(x=>x.trim());
  if(permissions.some(x=>['write','create','update','delete'].includes(x)))
   assert.equal(clause[2].trim(),'false',label+' contains an alternate writable permission: '+clause[0]);
 }
}
assertAllMarkWritesDenied(marksBlock,'Raw marks');
assertAllMarkWritesDenied(componentBlock,'Computer component marks');
for(const [label,block] of [['Raw marks',marksBlock],['Computer component marks',componentBlock]]){
 assert.throws(()=>assertAllMarkWritesDenied(block.replace(/allow\s+(?:create|update|delete|write)[^;]*;/g,''),label),/explicitly deny write permissions/,
  label+' test must reject missing write rules');
}

for(const [label,block] of [['Raw marks',marksBlock],['Computer component marks',componentBlock]]){
 // Mutation test: an additional OR-ed write permission must fail the gate,
 // even when the original explicit deny remains in place.
 for(const extra of ['allow create: if true;','allow create, update: if canAdmin(sid);','allow write: if true;']){
  assert.throws(()=>assertAllMarkWritesDenied(block+'\\n'+extra,label),/alternate writable permission/,
   label+' mutation must be rejected: '+extra);
 }
}

const attendanceBlock=rules.split('match /attendance/{id} {')[1]?.split(/\n\s*match \/[^\n]+\{/)[0]??'';
assert.ok(attendanceBlock.includes("memberRole(sid, 'school_admin') && validAdminAttendance()"),'Attendance create must require school admin or assigned teacher');
assert.ok(/allow update: if[\s\S]*?&& memberRole\(sid, 'school_admin'\);/.test(attendanceBlock),'Only school admin may update existing attendance');
assert.ok(!/allow (?:create|update):[^;]*canAdmin\(sid\)/.test(attendanceBlock),'Super admin must not bypass attendance write policy');
// Existing attendance must never be edited beyond the boolean present flag.
// Check the full update predicate so a future refactor cannot silently permit
// student/class/date reassignment or updates by other roles.
const attendanceUpdate=attendanceBlock.match(/allow update: if ([\s\S]*?);/)?.[1]??'';
for(const required of [
 'immutableSchool(sid)',
 "request.resource.data.diff(resource.data).affectedKeys().hasOnly(['present'])",
 'request.resource.data.present is bool',
 "memberRole(sid, 'school_admin')"
])assert.ok(attendanceUpdate.includes(required),'Attendance update missing: '+required);
for(const required of [
 'immutableSchool(sid)',
 "request.resource.data.diff(resource.data).affectedKeys().hasOnly(['present'])",
 'request.resource.data.present is bool'
]){
 const mutated=attendanceUpdate.replace(required,'true');
 assert.ok(mutated!==attendanceUpdate,'Mutation must change attendance update predicate');
 assert.ok(!mutated.includes(required),'Mutation must remove required attendance protection');
}
const examBlock=rules.split('match /exams/{id} {')[1]?.split(/\n\s*match \/[^\n]+\{/)[0]??'';
assert.ok(examBlock.includes("allow create: if memberRole(sid, 'school_admin')"),'Exam creation must require school admin');
assert.ok(!examBlock.includes('allow create: if canAdmin(sid)'),'Super admin must not bypass exam creation policy');
const teacherAssignmentBlock=rules.split('match /teacher_assignments/{id} {')[1]?.split(/\n\s*match \/[^\n]+\{/)[0]??'';
assert.ok(teacherAssignmentBlock,'Teacher assignment rules must exist');
// Both teacher assignment create and reactivation must verify the UID and
// school scope of the referenced teacher membership, not only its role.
const assignmentCreate=teacherAssignmentBlock.match(/allow create: if ([\s\S]*?);/)?.[1]??'';
const assignmentUpdate=teacherAssignmentBlock.match(/allow update: if ([\s\S]*?);/)?.[1]??'';
for(const [label,condition] of [['create',assignmentCreate],['update',assignmentUpdate]]){
 for(const required of [
  ".data.get('uid', '') == request.resource.data.uid",
  ".data.get('schoolId', '') == sid",
  ".data.get('role', '') == 'teacher'",
  ".data.get('active', false) == true"
 ])assert.ok(condition.includes(required),'Teacher assignment '+label+' missing '+required);
}

assert.ok(teacherAssignmentBlock.includes("allow create: if memberRole(sid, 'school_admin')"),'Teacher assignment create must require school admin');
assert.ok(teacherAssignmentBlock.includes("allow update: if memberRole(sid, 'school_admin')"),'Teacher assignment update must require school admin');
assert.ok(!/allow (?:create|update): if canAdmin\(sid\)/.test(teacherAssignmentBlock),'Super admin must not bypass teacher assignment write policy');
// Firestore ORs all matching allow clauses. Reject an extra broad write
// clause even when the intended school-admin-only clause remains present.
function assertNoAlternateSchoolWrites(block,label,allowed){
 const clauses=[...block.matchAll(/allow\s+([^:;]+):\s*if\s+([^;]+);/g)];
 const writes=clauses.filter(m=>m[1].split(',').some(p=>['write','create','update','delete'].includes(p.trim())));
 assert.ok(writes.length,label+' must declare explicit write policy');
 for(const clause of writes){
  const permissions=clause[1].split(',').map(p=>p.trim());
  for(const permission of permissions){
   if(!['write','create','update','delete'].includes(permission))continue;
   assert.ok(permission!=='write',label+' must not have a broad write allow');
   assert.ok(allowed[permission]?.some(rule=>rule.test(clause[2].trim())),
    label+' has unauthorized '+permission+' clause: '+clause[0]);
  }
 }
}
const schoolAdmin= /memberRole\(sid, 'school_admin'\)/;
assertNoAlternateSchoolWrites(attendanceBlock,'Attendance',{
 create:[/memberRole\(sid, 'school_admin'\).*validAdminAttendance\(\).*teacherAttendanceAllowed\(sid, id\)/],
 update:[/memberRole\(sid, 'school_admin'\)/],
 delete:[/^false$/]
});
assertNoAlternateSchoolWrites(examBlock,'Exam terms',{
 create:[/^memberRole\(sid, 'school_admin'\) && validExamTerm\(\)$/],
 update:[/^false$/],delete:[/^false$/]
});
assertNoAlternateSchoolWrites(teacherAssignmentBlock,'Teacher assignments',{
 create:[/^memberRole\(sid, 'school_admin'\)/],
 update:[/^memberRole\(sid, 'school_admin'\)/],
 delete:[/^false$/]
});
for(const [label,block,allowed] of [
 ['Attendance',attendanceBlock,{create:[/memberRole\(sid, 'school_admin'\).*validAdminAttendance\(\).*teacherAttendanceAllowed\(sid, id\)/],update:[schoolAdmin],delete:[/^false$/]}],
 ['Exam terms',examBlock,{create:[schoolAdmin],update:[/^false$/],delete:[/^false$/]}],
 ['Teacher assignments',teacherAssignmentBlock,{create:[schoolAdmin],update:[schoolAdmin],delete:[/^false$/]}]
]){
 for(const extra of ['allow write: if true;','allow create: if canAdmin(sid);','allow update: if true;','allow delete: if true;'])
  assert.throws(()=>assertNoAlternateSchoolWrites(block+'\n'+extra,label,allowed),/unauthorized|broad write/,label+' must reject '+extra);
}
assert.equal(rules.split('match /subject_assignments/{id}').length-1,1,'Subject assignment block must occur exactly once');
assert.equal(rules.split('match /{collection}/{id}').length-1,1,'Generic collection rule must occur exactly once');
assert.equal(rules.split('match /{document=**}').length-1,1,'Default-deny tail must occur exactly once');
const assignmentBlock=rules.split('match /subject_assignments/{id} {')[1]?.split('match /{collection}/{id}')[0]??'';
for(const field of ['studentId','subjectId'])
 assert.ok(assignmentBlock.includes("data."+field+".matches('^[A-Za-z0-9_-]{1,128}$')"),'Truncated '+field+' regex');
assert.ok(rules.trimEnd().endsWith('}'));
assert.ok(!rules.includes('}\\n})'),'Malformed duplicate tail');
console.log('V47 structural school isolation checks passed; emulator tests still required');
