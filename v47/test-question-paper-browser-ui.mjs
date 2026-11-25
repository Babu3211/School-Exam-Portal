import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./question-paper.html',import.meta.url),'utf8');
const js=readFileSync(new URL('./question-paper-console.mjs',import.meta.url),'utf8');
const hub=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const paths=[
 'cdc-source-register-2083.json','cdc-grade8-science-practice-pack-v1.json',
 'cdc-grade10-science-practice-pack-v1.json'
];
for(const p of paths){
 assert.match(html,new RegExp('href="\\./'+p.replace(/\./g,'\\.')+'"'));
 assert.match(js,new RegExp(p.replace(/\./g,'\\.')));
}
for(const id of ['connect','schoolId','email','password','login','logout','resourceArea','grade',
 'sourceStatus','sourceList','preview8','preview10','paperStatus','paperFrame','printPractice','showAnswers','downloadPracticeDocx'])
 assert.match(html,new RegExp('id="'+id+'"'));
assert.match(html,/READ-ONLY PREVIEW/);
assert.match(html,/Grade 9 Science pack remains blocked/);
assert.match(html,/question-paper-console\.mjs/);
assert.match(html,/sandbox="allow-same-origin allow-modals"/);
assert.doesNotMatch(html,/sandbox="[^"]*allow-scripts/);
assert.match(js,/verifySchoolSession\(/);
assert.match(js,/enforceSchoolIdle\(/);
assert.match(js,/assertSame\(/);
assert.match(js,/prepareCdcSourceCatalog\(/);
assert.match(js,/prepareReadOnlyPracticePaper\(/);
assert.match(js,/recommendedPracticeIndices\(/);
assert.match(js,/printReadOnlyPracticePaper\(/);
assert.match(js,/printMathPractice\(/);
assert.match(js,/exportPracticeDocx\(/);
assert.match(js,/target='_blank'/);
assert.match(js,/rel='noopener noreferrer'/);
assert.match(js,/paperFrame/);
assert.match(hub,/href="\.\/question-paper\.html"/);
assert.doesNotMatch(js,/from '\.\.\/cdc-question-paper\.js'|getFirestore\(|setDoc\(|addDoc\(|deleteDoc\(|writeBatch\(/);
assert.doesNotMatch(js,/firebaseConfig|apiKey|password\s*=\s*['"][^'"]+['"]/);
assert.doesNotMatch(js,/grade9-science-practice-pack-v1\.json/);
console.log('PASS V47 read-only school-verified CDC sources/practice question page; no V46 production Firebase writes');
