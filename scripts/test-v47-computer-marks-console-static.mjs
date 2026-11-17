import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync('v47/computer-marks.html','utf8'),js=readFileSync('v47/computer-marks-console.mjs','utf8');
for(const id of ['config','connect','schoolId','email','password','login','logout','work','schoolClass','term','studentId','subjectId','loadStudents','loadSubjects','component_a','component_b','component_c','save','message'])assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
for(const expected of ['smss-exam-portal-v47','inMemoryPersistence','createComputerComponentMark','member.data().active','school.data().active','school_admin','api.where(\'class\'','api.limit(100)','api.startAfter(cursor)','row.name===\'Computer\'','loadedStudentClass','loadedSubjectClass','attempt!==epoch','textContent'])assert.ok(js.includes(expected),'Missing '+expected);
assert.doesNotMatch(js,/\bloadedClass\b/);
assert.match(js,/loadedStudentClass!==\$\('schoolClass'\)\.value\|\|loadedSubjectClass!==\$\('schoolClass'\)\.value/);
assert.match(html,/Development only/);assert.match(html,/max="4"/);assert.match(html,/max="36"/);assert.match(html,/max="10"/);
assert.doesNotMatch(js,/localStorage|sessionStorage|innerHTML|eval\(/);
console.log('V47 Computer component browser static checks passed');
