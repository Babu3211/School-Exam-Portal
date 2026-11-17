import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync('v47/assignments.html','utf8'),js=readFileSync('v47/assignments-console.mjs','utf8');
for(const id of ['config','connect','schoolId','email','password','login','logout','work','schoolClass','studentId','subjectId','loadStudents','loadSubjects','save','message'])assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
for(const text of ['smss-exam-portal-v47','inMemoryPersistence','createSubjectAssignment','school_admin','school.data().active','member.data().active','where(\'class\'','page.at(-1)','loadedClass','api.limit(100)','textContent','attempt!==epoch'])assert.ok(js.includes(text),'Missing '+text);
assert.doesNotMatch(js,/localStorage|sessionStorage|innerHTML|eval\(/);
console.log('V47 assignment browser static checks passed');
