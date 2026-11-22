import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync('v47/subjects.html','utf8'),js=readFileSync('v47/subjects-console.mjs','utf8'),shared=readFileSync('v47/school-firebase-client.mjs','utf8');
for(const id of ['connect','schoolId','email','password','login','logout','work','heading','subjectId','subjectName','schoolClass','creditHour','theoryFullMarks','practicalFullMarks','save','message'])assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
for(const term of ['connectSchoolFirebase','createSchoolSubject','verifySchoolSession','school.data().active','school_admin','attempt!==epoch','textContent'])assert.ok(js.includes(term),'Missing '+term);
assert.match(shared,/smss-exam-portal-v47/);
assert.match(shared,/browserSessionPersistence/);
assert.match(html,/\.\/marks-entry\.html#classSaveArea/,'Configured component marks must use the unified marks entry');
assert.doesNotMatch(js,/localStorage|sessionStorage|innerHTML|eval\(/);
console.log('V47 subject UI uses verified Firebase and configurable marks/credit hours');
