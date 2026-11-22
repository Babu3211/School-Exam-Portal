import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync('v47/marks-entry.html','utf8'),js=readFileSync('v47/marks-entry-console.mjs','utf8');
for(const id of ['connect','schoolId','email','password','login','logout','work','schoolClass','term','studentId','subjectId','loadStudents','loadSubjects','theory','practical','save','message'])assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
const firebaseClient=readFileSync('v47/school-firebase-client.mjs','utf8');assert.match(firebaseClient,/smss-exam-portal-v47/);assert.match(firebaseClient,/browserSessionPersistence/);assert.match(js,/connectSchoolFirebase/);for(const term of ['readSmssMarksExcel','buildClassMarksExcelSample','buildClassReviewExcel','verifySchoolSession','loadCompleteClassRoster','inspectClassMarkDraft','school_admin','school.data().active','attempt!==epoch','textContent'])assert.ok(js.includes(term),'Missing '+term);
assert.ok(js.includes("$('saveClassMarks').disabled=true"));
assert.match(js,/Save\/Publish disabled: secure complete-class workflow is not implemented/);
assert.match(js,/actor\.role!=='school_admin'/);
assert.doesNotMatch(js,/\bcreateSchoolMarkOnly\b|\bsaveVerifiedSmallClassMarks\b/,'Preview must not expose unauthorized mark writes');

assert.match(html,/NOT verified CDC\/IEMIS results/);assert.match(html,/accept="\.xlsx,application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet"/,'Student marks import must be Excel XLSX only');
assert.doesNotMatch(js,/localStorage|sessionStorage|eval\(|innerHTML|createSchoolStore|listPage\(/);
assert.match(js,/finally\{if\(attempt===epoch\)lock\(false\)\}/,'Stale roster request must not unlock controls');
assert.match(js,/schoolClass!==\$\('schoolClass'\)\.value/,'Roster query must check class before rendering');
console.log('V47 school-admin raw mark entry static tests passed');
