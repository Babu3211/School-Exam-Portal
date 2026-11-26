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
assert.match(rules,/data\.theory <= 100/);
assert.match(rules,/data\.practical <= 100/);
assert.match(rules,/teacherMarkAllowed\(sid, id\)/);
assert.match(rules,/teacherAttendanceAllowed\(sid, id\)/);
assert.match(rules,/allow delete: if false;/);
// Added one small, explicit teacher-only draft collection. Keep a strict size
// ceiling AND require its role, assignment and publication isolation guards.
// The one explicit self-activity block has its own bounded budget and guards.
// All other rules retain the original 40,000-character ceiling.
const activityStart='      match /dashboard_activity/{uid} {';
const activityEnd='      // Teacher assignments are separate';
const start=rules.indexOf(activityStart),end=rules.indexOf(activityEnd,start);
assert.ok(start>=0&&end>start,'Missing dedicated activity block');
assert.equal(rules.split(activityStart).length-1,1,'Duplicate activity block');
const activity=rules.slice(start,end);
assert.ok(activity.length<1400,'Activity rules unexpectedly expanded');
const viewStart=rules.indexOf('      match /official_read_views/{id} {');
const viewEnd=rules.indexOf('      match /official_marks_pointers/{id} {',viewStart);
assert.ok(viewStart>=0&&viewEnd>viewStart);
const viewBlock=rules.slice(viewStart,viewEnd);
assert.ok(viewBlock.length<1100);
for(const guard of ['activeMember(sid) && currentView()','allow list, write: if false;','get(p).data.publicationId == resource.data.publicationId','get(p).data.contentDigest == resource.data.contentDigest','get(p).data.settingsDigest == resource.data.settingsDigest'])assert.ok(viewBlock.includes(guard),'Read view rule missing '+guard);
// Dedicated Staff block replaces the old generic Staff write permission.
const staffStart='      // Staff profile updates cannot bypass';
const staffEnd='      match /{collection}/{id} {';
const staffIndex=rules.indexOf(staffStart),staffEndIndex=rules.indexOf(staffEnd,staffIndex);
assert.ok(staffIndex>=0&&staffEndIndex>staffIndex,'Dedicated Staff rules required');
assert.equal(rules.split('match /staff/{id} {').length-1,1,'Exactly one Staff match required');
const staff=rules.slice(staffIndex,staffEndIndex);
assert.ok(staff.length<2600,'Unexpected Staff rules expansion');
for(const guard of [
 'allow get, list: if canRead(sid);',
 'allow create: if canAdmin(sid) && scopedRecord(sid)',
 'allow update: if canAdmin(sid) && immutableSchool(sid)',
 "changed.hasOnly(['authUid','email'])",
 "changed.hasAll(['authUid'])",
 "(!linked(resource.data) || !changed.hasAny(['email','emailId']))",
 "!request.resource.data.keys().hasAny(['authUid','firebaseUid','userUid','uid'])",
 "!exists(p) && existsAfter(p)",
 "getAfter(p).data.role == 'teacher' && getAfter(p).data.active == false",
 "getAfter(p).data.uid == uid && getAfter(p).data.schoolId == sid",
 "(profileEdit() || (memberRole(sid, 'school_admin') && newTeacherLink()))",
 'allow delete: if false;'
])assert.ok(staff.includes(guard),'Staff guard missing: '+guard);
assert.equal((staff.match(/allow\s+(?:create|update)\s*:/g)||[]).length,2);
assert.doesNotMatch(staff,/allow\s+write\s*:/);
const generic=rules.slice(staffEndIndex);
assert.doesNotMatch(generic,/collection in \[[^\]]*'staff'/,'Staff must not have alternate wildcard permissions');
const missingStart=rules.indexOf('          // Authorize missing-draft lookup only');
const missingEnd=rules.indexOf('          allow get: if teacherMayReadMissingDraft() || canAdmin(sid) || teacherMayReadDraft();',missingStart);
assert.ok(missingStart>=0&&missingEnd>missingStart);
const missingBlock=rules.slice(missingStart,missingEnd);
assert.ok(missingBlock.length<3000,'Unexpected missing-draft rule expansion');
for(const guard of ["loggedIn() && request.auth.uid == teacherUid && !exists(target)","missingDraftMember(get(schoolPath(sid)).data, get(memberPath(sid)).data)","missingDraftDuty(get(config).data)","s.get('active',false) == true","m.get('active',false) == true","m.get('uid','') == teacherUid","m.get('schoolId','') == sid","m.get('role','') == 'teacher'","c.get('schoolId','') == sid","c.get('active',false) == true","id == c.classId + '_' + c.subjectId + '_' + c.examId","missingDraftDependencies(c,get(subject).data,get(duty).data)","s.get('schoolId','') == sid","s.get('class','') == c.classId","a.get('active',false) == true","a.get('uid','') == teacherUid","a.get('schoolId','') == sid","a.get('classId','') == c.classId","a.get('subjectId','') == c.subjectId"])assert.ok(missingBlock.includes(guard),'Missing first-draft guard '+guard);
assert.equal((missingBlock.match(/\bget\((?:subject|duty|config)\)/g)||[]).length,3,'Each authoritative dependency is read exactly once');
assert.doesNotMatch(missingBlock,/allow\s/);
const worksheetStart=rules.indexOf('      // Private assessment worksheet drafts;');
const worksheetEnd=rules.indexOf('      // Per-student CDC assessment evidence',worksheetStart);
assert.ok(worksheetStart>=0&&worksheetEnd>worksheetStart);
const worksheetBlock=rules.slice(worksheetStart,worksheetEnd);
assert.ok(worksheetBlock.length<5000);
for(const guard of ["request.auth.uid == teacherUid","m.get('role','') == 'teacher'","m.get('schoolId','') == sid","p.get('schoolId','') == sid","p.get('class','') == classId","p.get('active',true) == true","a.get('uid','') == teacherUid","a.get('classId','') == classId","a.get('subjectId','') == subjectId","a.get('active',false) == true","d.format == 'smss-v47-primary-math-draft-v1'","request.resource.data.revision == resource.data.revision + 1","allow list, delete: if false;"])assert.ok(worksheetBlock.includes(guard),'Assessment draft guard missing '+guard);
assert.doesNotMatch(worksheetBlock,/allow\s+write\s*:/);
const normalizedRules=rules.replace(missingBlock,'').replace('teacherMayReadMissingDraft() || ','').replace(worksheetBlock,'');
assert.ok(normalizedRules.length-activity.length-viewBlock.length-staff.length<40000,'Unexpected Firestore rules expansion outside bounded additions');
for(const guard of ["activeMember(sid) && request.auth.uid == uid","d.keys().hasOnly(['schoolId','uid','lastSeen'])","d.schoolId == sid && d.uid == uid && d.lastSeen == request.time","allow list: if canAdmin(sid);","request.time >= resource.data.lastSeen + duration.value(15,'m')","allow delete: if false;"])
 assert.ok(activity.includes(guard),'Activity guard missing: '+guard);
assert.equal((activity.match(/allow\s+(?:create|update)\s*:/g)||[]).length,2);
assert.doesNotMatch(activity,/allow\s+write\s*:/);

const teacherDraftBlock=rules.split('match /teacher_mark_drafts/{teacherUid} {')[1]?.split('      // Complete-class DRAFT only.')[0]??'';
assert.ok(teacherDraftBlock.length>1500&&teacherDraftBlock.length-missingBlock.length-'teacherMayReadMissingDraft() || '.length<7000,
 'Exactly one bounded teacher-only class draft block required');
for(const guard of [
 "memberRole(sid, 'teacher')",
 'request.auth.uid == teacherUid',
 "d.format == 'smss-v47-teacher-class-draft-v1'",
 "d.state == 'draft'",
 'function teacherMayReadDraft()',
 'get(duty).data.get(\'active\',false) == true',
 "get(currentTeacherAssignment()).data.get('active', false) == true",
 "get(config).data.get('active', false) == true",
 "request.resource.data.revision == resource.data.get('revision', 0) + 1",
 'allow delete: if false;'
])assert.ok(teacherDraftBlock.includes(guard),'Teacher Draft rule missing '+guard);
assert.equal((rules.match(/match \/teacher_mark_drafts\/\{teacherUid\}/g)||[]).length,1,
 'Teacher class draft path must not be duplicated');
assert.equal((rules.match(/match \/class_mark_drafts\/\{id\}/g)||[]).length,1,
  'Exactly one bounded non-official draft collection required');
assert.match(rules,/request\.resource\.data\.revision == resource\.data\.get\('revision', 0\) \+ 1/,
  'Draft updates must use compare-and-swap revision');
assert.match(rules,/d\.state == 'draft'/,'Draft collection may not publish results');
assert.equal((rules.match(/match \/\{document=\*\*\}/g)||[]).length,1,'Default deny must remain unique');
assert.ok(rules.trimEnd().endsWith('}'),'Rules missing final closing brace');
console.log('V47 current Firestore rules structural contract passed; emulator authorization remains mandatory');
