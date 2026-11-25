import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {practiceUnitOptions,generatePracticePreview} from './automatic-practice-preview.mjs';
import {printReadOnlyPracticePaper} from './question-paper-cdc-preview.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const bilingual=read('./cdc-science-bilingual-mcq-v1.json').translations;
let state=1;const rng=()=>((state=(state*1664525+1013904223)>>>0)/4294967296);
for(const grade of [8,10]){
 const pack=read('./cdc-grade'+grade+'-science-practice-pack-v1.json');
 const args={schoolId:'12345',schoolName:'Test School',pack,bilingual,rng};
 const options=practiceUnitOptions({pack,bilingual,language:'ne'});
 const topicIds=options.filter(u=>u.available).map(u=>u.id);
 const a=generatePracticePreview({...args,topicIds,fullMarks:50,language:'ne'});
 assert.equal(a.totalMarks,50);assert.equal(a.questions.reduce((s,q)=>s+q.marks,0),50);assert.equal(a.official,false);assert.equal(a.writeAuthorized,false);
 assert.equal(new Set(a.questions.map(q=>q.topicId)).size,topicIds.length);
 const b=generatePracticePreview({...args,topicIds,fullMarks:50,language:'ne',avoidSignatures:[a.signature]});
 assert.notEqual(a.signature,b.signature);
 for(const language of ['en','both']){
  const selected=practiceUnitOptions({pack,bilingual,language}).filter(u=>u.available).slice(0,3).map(u=>u.id);
  assert.equal(selected.length,3);
  const c=generatePracticePreview({...args,topicIds:selected,fullMarks:3,language});
  assert.equal(c.questions.length,3);
  const print=printReadOnlyPracticePaper({paper:c,showAnswers:true});
  assert.match(print,/NOT AN OFFICIAL CDC QUESTION PAPER/);
  assert.match(print,/Teacher-review answer:/);
  assert.ok(c.questions.every(q=>language==='en'?!/[\u0900-\u097f]/.test(q.questionText):q.questionText.includes('\n')));
 }
 assert.throws(()=>generatePracticePreview({...args,topicIds,fullMarks:1,language:'ne'}));
}
console.log('PASS V47 automatic practice paper: preserved V46 planner, exact full marks, language, unit selection, non-repeat, no official approval');
