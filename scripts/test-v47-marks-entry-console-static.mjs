import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync('v47/marks-entry.html','utf8'),js=readFileSync('v47/marks-entry-console.mjs','utf8');
for(const id of ['config','connect','schoolId','email','password','login','logout','work','schoolClass','term','studentId','subjectId','loadStudents','loadSubjects','theory','practical','save','message'])assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
for(const term of ['smss-exam-portal-v47','inMemoryPersistence','createSchoolMarkOnly','preflightRawMarkSave','api.where(\'class\'','api.limit(100)','api.startAfter(cursor)','loadedClass','school_admin','member.data().active','school.data().active','attempt!==epoch','pageSize:100','textContent'])assert.ok(js.includes(term),'Missing '+term);
assert.match(html,/NOT verified CDC\/IEMIS results/);
assert.doesNotMatch(js,/localStorage|sessionStorage|eval\(|innerHTML|createSchoolStore|listPage\(/);
console.log('V47 school-admin raw mark entry static tests passed');
