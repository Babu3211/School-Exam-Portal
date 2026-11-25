import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareCdcSourceCatalog,prepareReadOnlyPracticePaper,recommendedPracticeIndices,printReadOnlyPracticePaper} from './question-paper-cdc-preview.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const pairs=[
 ['./cdc-source-register-2083.json','../data/cdc-question-paper-sources-2083.json'],
 ['./cdc-grade8-science-practice-pack-v1.json','../data/cdc-grade8-science-practice-pack-v1.json'],
 ['./cdc-grade10-science-practice-pack-v1.json','../data/cdc-grade10-science-practice-pack-v1.json']
];
for(const [v47,v46] of pairs){
 const expected=read(v46);
 if(v47===pairs[2][0]){
  // V46 development 4a0c6f71 corrected mixed-script text in one question.
  // Root production source remains unchanged. No other divergence is allowed.
  assert.equal(expected.questions[3].unitCode,'2');
  assert.equal(expected.questions[3].options[0],'साझा लक्षण र പരിണामिक सम्बन्ध');
  assert.equal(expected.questions[3].answer,'जीवहरूको साझा लक्षण र പരിണामिक सम्बन्ध वर्गीकरणका आधार हुन्।');
  expected.questions[3].options[0]='साझा लक्षण र विकासक्रमीय सम्बन्ध';
  expected.questions[3].answer='जीवहरूको साझा लक्षण र विकासक्रमीय सम्बन्ध वर्गीकरणका आधार हुन्।';
 }
 assert.deepEqual(read(v47),expected,'V47 source parity with the pinned V46 correction: '+v47);
}
const register=read(pairs[0][0]),catalog=prepareCdcSourceCatalog(register);
assert.equal(catalog.completeOfficialBlueprint,false);
assert.equal(catalog.metadataOnly,true);
assert.equal(catalog.sources.length,register.sources.length);
assert(catalog.sources.every(s=>s.url.startsWith('https://')));
assert(catalog.sources.filter(s=>s.grades.includes(8)).length>=1);
assert(prepareCdcSourceCatalog(register,{grade:8}).sources.every(s=>s.grades.includes(8)));
assert.throws(()=>prepareCdcSourceCatalog({...register,sources:[{...register.sources[0],url:'javascript:alert(1)'}]}),/non-CDC/);
assert.throws(()=>prepareCdcSourceCatalog(register,{grade:0}),/grade/);
const sid='300160003',schoolName='Test <School> & Company';
for(const grade of [8,10]){
 const pack=read('./cdc-grade'+grade+'-science-practice-pack-v1.json');
 const indices=recommendedPracticeIndices(pack);
 assert(indices.length>3&&indices.length<=11);
 const paper=prepareReadOnlyPracticePaper({schoolId:sid,schoolName,pack,questionIndices:indices});
 assert.equal(paper.grade,grade);
 assert.equal(paper.official,false);
 assert.equal(paper.approved,false);
 assert.equal(paper.writeAuthorized,false);
 assert.equal(paper.teacherReviewRequired,true);
 assert.equal(paper.questions.length,indices.length);
 assert.equal(paper.totalMarks,indices.reduce((s,i)=>s+pack.questions[i].marks,0));
 const html=printReadOnlyPracticePaper({paper});
 assert.match(html,/UNREVIEWED ORIGINAL PRACTICE/);
 assert.match(html,/NOT AN OFFICIAL CDC QUESTION PAPER/);
 assert.match(html,/Test &lt;School&gt; &amp; Company/);
 assert.match(html,/noindex,nofollow/);
 assert.doesNotMatch(html,/Teacher-review answer:/);
 assert.equal((html.match(/<li><div>/g)||[]).length,indices.length);
 const key=printReadOnlyPracticePaper({paper,showAnswers:true});
 assert.match(key,/Teacher-review answer:/);
 assert.equal((key.match(/Teacher-review answer:/g)||[]).length,indices.length);
 assert.throws(()=>prepareReadOnlyPracticePaper({schoolId:sid,schoolName,pack,questionIndices:[0,0]}),/Unique/);
 assert.throws(()=>prepareReadOnlyPracticePaper({schoolId:'999',schoolName,pack,questionIndices:[0]}),/IEMIS/);
 assert.throws(()=>printReadOnlyPracticePaper({paper:{...paper,official:true}}),/read-only/);
 assert.throws(()=>printReadOnlyPracticePaper({paper:{...paper,questions:[{...paper.questions[0],marks:999}]}}),/changed after preview/);
 const injection={...pack,questions:[{...pack.questions[0],questionText:'<script>alert(1)</script>',answer:'<img src=x>'},...pack.questions.slice(1)]};
 const escaped=printReadOnlyPracticePaper({paper:prepareReadOnlyPracticePaper({schoolId:sid,schoolName,pack:injection,questionIndices:[0]}),showAnswers:true});
 assert.match(escaped,/&lt;script&gt;/);
 assert.match(escaped,/&lt;img/);
 assert.doesNotMatch(escaped,/<script>|<img /);
}
const grade9={...read(pairs[1][0]),gradeNumber:9};
assert.throws(()=>prepareReadOnlyPracticePaper({schoolId:sid,schoolName,pack:grade9,questionIndices:[0]}),/Only preserved V46/);
console.log('PASS V47 CDC practice source parity: grade8/10 original teacher-review-required, safe HTML, no official paper or writes');
