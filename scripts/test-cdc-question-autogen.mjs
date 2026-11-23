import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readBundledScienceBank,buildAutomaticQuestionPaper,supportsQuestionLanguage} from '../cdc-question-autogen.mjs';
const src=p=>JSON.parse(readFileSync(new URL('../data/'+p,import.meta.url),'utf8'));
let state=0;
const rng=()=>((state=(state*1664525+1013904223)>>>0)/4294967296);
for(const grade of [8,10]){
 const pack=src('cdc-grade'+grade+'-science-practice-pack-v1.json');
 const b=readBundledScienceBank(pack,{grade,subject:'विज्ञान तथा प्रविधि'});
 assert.equal(b.questions.length,grade===8?55:57);
 assert.equal(b.units.length,grade===8?11:19);
 const translationRegister=src('cdc-science-bilingual-mcq-v1.json');
 const translated=readBundledScienceBank(pack,{grade,subject:'Science',bilingual:translationRegister.translations});
 assert.equal(translated.questions.filter(q=>q.questionTextEn).length,b.units.length);
 const langTopics=translated.units.slice(0,grade===8?5:8).map(x=>x.id+'_0');
 for(const language of ['en','both']){
  const paper=buildAutomaticQuestionPaper({questions:translated.questions,
   topicIds:langTopics,fullMarks:langTopics.length,language,rng});
  assert.equal(paper.questions.length,langTopics.length);
  assert.equal(paper.questions.reduce((n,q)=>n+q.marks,0),langTopics.length);
  assert.ok(paper.questions.every(q=>language==='en'?!/[\u0900-\u097f]/.test(q.questionText):
    /[\u0900-\u097f]/.test(q.questionText)&&q.questionText.includes(String.fromCharCode(10))));
  for(const q of paper.questions){
   const original=translated.questions.find(item=>item.id===q.id);
   assert.equal(q.options[q.correctOption.charCodeAt(0)-65].split(' / ')[0],
    language==='both'?original.options[0]:original.optionsEn[0]);
  }
 }
 // Translation provenance must be bound to the exact original question,
 // not merely to a unit number, so a revised question cannot receive a
 // different question's answer key.
 {
  const forged=structuredClone(pack);
  const first=forged.questions.find(x=>x.questionType==='mcq');
  first.questionText='A different Nepali question with a new answer';
  assert.throws(()=>readBundledScienceBank(forged,{grade,subject:'science',
   bilingual:translationRegister.translations}),/Bilingual source question/);
  const alteredOptions=structuredClone(pack);
  alteredOptions.questions.find(x=>x.questionType==='mcq').options[1]='बदलिएको विकल्प';
  assert.throws(()=>readBundledScienceBank(alteredOptions,{grade,subject:'science',
   bilingual:translationRegister.translations}),/Bilingual source question/);
 }
 const topicIds=b.units.map(x=>x.id+'_0');
 for(const target of [25,50]){
  const p=buildAutomaticQuestionPaper({questions:b.questions,topicIds,fullMarks:target,rng});
  assert.equal(p.fullMarks,target);
  assert.equal(p.questions.reduce((n,x)=>n+x.marks,0),target);
  assert.equal(new Set(p.questions.map(x=>x.id)).size,p.questions.length);
  assert.equal(new Set(p.questions.map(x=>x.topicId)).size,topicIds.length);
  assert.equal(p.teacherReviewRequired,true);
  assert.equal(p.blueprintMatched,false);
  for(const q of p.questions)if(q.questionType==='mcq'){
   assert.equal(q.options.length,4);
   assert.match(q.correctOption,/^[A-D]$/);
   const original=b.questions.find(x=>x.id===q.id);
   assert.equal(q.options[q.correctOption.charCodeAt(0)-65],
    original.options[original.correctOption.charCodeAt(0)-65]);
  }
 }
 const exact=[{type:'mcq',count:2,marks:1},{type:'short',count:2,marks:grade===8?5:2}];
 const total=exact.reduce((n,x)=>n+x.count*x.marks,0);
 const twoTopics=b.units.slice(0,2).map(u=>u.id+'_0');
 const p=buildAutomaticQuestionPaper({questions:b.questions,topicIds:twoTopics,fullMarks:total,
  blueprint:{fullMarks:total,pattern:exact},rng});
 assert.equal(p.blueprintMatched,true);
 assert.deepEqual(p.questions.filter(x=>x.questionType==='mcq').map(x=>x.marks),[1,1]);
 assert.equal(p.questions.reduce((n,x)=>n+x.marks,0),total);
 assert.throws(()=>buildAutomaticQuestionPaper({questions:b.questions,
  topicIds:twoTopics,fullMarks:total,
  blueprint:{fullMarks:total,pattern:[{type:'long',count:1,marks:total}]},rng}),/needs|grid|more|questions/);
 assert.throws(()=>buildAutomaticQuestionPaper({questions:b.questions,
  topicIds:topicIds.slice(0,1),fullMarks:500,rng}),/Cannot make/);
 assert.throws(()=>buildAutomaticQuestionPaper({questions:b.questions,topicIds,
  fullMarks:50,language:'both',rng}),/No reviewed questions|lacks valid/);
 assert.throws(()=>readBundledScienceBank({...pack,gradeNumber:9},
  {grade,subject:'science'}),/metadata/);
}
assert.throws(()=>buildAutomaticQuestionPaper({questions:[],topicIds:['topic'],
 fullMarks:50,language:'ne'}),/No reviewed/);
assert.throws(()=>buildAutomaticQuestionPaper({questions:[],topicIds:['topic','topic'],
 fullMarks:10}),/distinct topics/);
assert.throws(()=>buildAutomaticQuestionPaper({questions:[],topicIds:['topic'],
 fullMarks:10.5}),/whole number/);
assert.equal(supportsQuestionLanguage({questionText:'परिकल्पना के हो?'},'en'),false);
assert.equal(supportsQuestionLanguage({questionText:'Define force.'},'en'),true);
console.log('PASS V46 original practice paper auto planner: Grades 8/10 25/50 marks, all topics, valid answer keys, exact reference-grid pattern, language fails closed');

const page=readFileSync(new URL('../cdc-question-paper.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
for(const id of ['qpSmartGenerateBtn','qpAutoLanguage','qpTopicSelectAll','qpTopicClearAll','qpAutoSourceStatus'])
 assert.ok(page.includes('id="'+id+'"'),'Missing auto builder control '+id);
assert.match(page,/readBundledScienceBank\(/);
assert.match(page,/buildAutomaticQuestionPaper\(/);
assert.match(page,/async function generateSmartPaper\(/);
assert.match(page,/async function loadBundledPracticeBank\(/);
assert.match(page,/roleCanTeach\(selectedClass,selectedSubject,selectedSection\)/);
assert.match(page,/teacherReviewRequired:true/);
assert.match(page,/blueprintId:planned\.exactGridMatched/);
assert.match(sw,/cdc-question-autogen\.mjs/);
assert.match(sw,/cdc-science-bilingual-mcq-v1\.json/);
console.log('PASS V46 Browser auto builder wiring, role-safety and offline packaging');

import {isSupportedScienceSubject} from '../cdc-question-autogen.mjs';
for(const label of ['Science','Science and Technology','Science & Technology','विज्ञान तथा प्रविधि'])
 assert.equal(isSupportedScienceSubject(label),true,label);
for(const label of ['Computer Science','Computer','ऐच्छिक कम्प्युटर विज्ञान','Social Science','Science of computing'])
 assert.equal(isSupportedScienceSubject(label),false,label);
assert.throws(()=>readBundledScienceBank(src('cdc-grade8-science-practice-pack-v1.json'),
 {grade:8,subject:'Computer Science'}),/No curated/);
assert.match(page,/questionDataLoadEpoch/);
assert.match(page,/generatedPaper=null/);
assert.match(page,/Topic, भाषा वा प्रश्नपत्र विवरण परिवर्तन/);
assert.match(page,/CDC प्रकाशित नमुना होइन/);
console.log('PASS subject-scoped source isolation, changing selection invalidation and printed draft caution');

assert.match(page,/verifiedQuestionSelection=null/);
assert.match(page,/verifiedQuestionSelection\.request!==questionDataLoadEpoch/);
assert.match(page,/verifiedQuestionSelection=\{className,subject,section,request\}/);
console.log('PASS rejected stale subject/class/section loads before generating question paper');

assert.match(page,/function updateAutoReviewActions\(/);
assert.match(page,/function invalidateGeneratedQuestionPaper\(/);
assert.match(page,/id="qpAutoReviewed"/);
assert.match(page,/if\(generatedPaper\.qualityReport\?\.teacherReviewRequired/);
assert.match(page,/loadBundledPracticeBank\(\{grade,subject\}\)/);
assert.match(page,/if\(!stillCurrent\(\)\)return;/);
assert.doesNotMatch(page,/async function loadBundledPracticeBank\(\)\{/);
console.log('PASS V46 read-only async practice load prevents stale class data, review gate required before paper output');

const scoped=readBundledScienceBank(src('cdc-grade8-science-practice-pack-v1.json'),{
 grade:8,subject:'Science'
});
assert.throws(()=>buildAutomaticQuestionPaper({questions:scoped.questions,
 topicIds:scoped.units.slice(0,2).map(x=>x.id+'_0'),
 fullMarks:2,language:'ne',gradeNumber:7,subject:'Science'}),/No reviewed/);
console.log('PASS classroom grade isolation of preloaded bank');

assert.match(page,/aggregateExactCdcGrid\(/);
assert.match(page,/id="qpBpGridFile"/);
assert.match(page,/id="qpBpAnalyzeGrid"/);
assert.match(page,/function inspectAdminUnitGrid\(/);
assert.match(page,/const pattern=calculated\.pattern,distribution=calculated\.distribution/);
assert.match(page,/if\(calculated\.fullMarks!==Number/);
console.log('PASS CDC Grid import, derived mark count/level and mismatch refusal wiring');

assert.match(page,/id="qpGridAudit"/);
assert.match(page,/gridEvidence:\{questionId:String\(q\.id\)/);
assert.match(page,/if\(planned\.exactGridMatched&&\(!evidence/);
console.log('PASS saved-paper per-question exact CDC unit/type/cognitive evidence and teacher-only grid audit');
