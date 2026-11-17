import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync('v47/subjects.html','utf8'),js=readFileSync('v47/subjects-console.mjs','utf8');
for(const id of ['config','connect','schoolId','email','password','login','logout','work','heading','subjectId','subjectName','schoolClass','save','message'])assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
for(const term of ['smss-exam-portal-v47','inMemoryPersistence','createSchoolSubject','member.data().active','school.data().active','school_admin','attempt!==epoch','textContent'])assert.ok(js.includes(term),'Missing '+term);
assert.doesNotMatch(js,/localStorage|sessionStorage|innerHTML|eval\(/);
console.log('V47 subject creation UI static tests passed');
