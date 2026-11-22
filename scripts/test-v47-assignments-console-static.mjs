import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync('v47/assignments.html','utf8'),js=readFileSync('v47/assignments-console.mjs','utf8'),shared=readFileSync('v47/school-firebase-client.mjs','utf8');
for(const id of ['connect','schoolId','email','password','login','logout','work','schoolClass','studentId','subjectId','loadStudents','loadSubjects','save','message'])assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
for(const term of ['connectSchoolFirebase','createSubjectAssignment','verifySchoolSession','school.data().active','school_admin',"api.where('class'","page.at(-1)",'loadedClass','api.limit(100)','textContent','attempt!==epoch','authSdk.onAuthStateChanged','loadRequest','Cross-school or wrong-class record'])assert.ok(js.includes(term),'Missing '+term);
assert.match(shared,/smss-exam-portal-v47/);assert.match(shared,/browserSessionPersistence/);
assert.match(js,/auth.currentUser\?\.uid!==actor\?\.uid/,'Assignments must verify live auth');
assert.match(js,/session.role!=='school_admin'/,'Assignments must revalidate School Admin before writes');
assert.doesNotMatch(js,/localStorage|sessionStorage|innerHTML|eval\(/);
console.log('V47 school-scoped subject assignment UI static checks passed');
