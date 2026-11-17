import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync('v47/marks-preview.html','utf8'),js=readFileSync('v47/marks-preview-console.mjs','utf8');
for(const id of ['config','connect','schoolId','email','password','login','logout','work','schoolClass','term','load','next','rows','count','export','audit','message'])assert.ok(html.includes('id="'+id+'"'),'Missing element '+id);
for(const term of ['smss-exam-portal-v47','inMemoryPersistence','loadMarksByClassTerm','members','member.data().active','pageSize:50','textContent','epoch','rawMarksCsv','URL.createObjectURL','auditLoadedMarks','loadingEpoch===current'])assert.ok(js.includes(term),'Missing safety feature '+term);
assert.match(html,/NOT a CDC\/IEMIS 2083 Mark Ledger/);
assert.doesNotMatch(js,/setDoc|addDoc|updateDoc|deleteDoc|writeBatch|localStorage/,'Preview must remain read-only and ephemeral');
console.log('V47 read-only marks preview static tests passed');
