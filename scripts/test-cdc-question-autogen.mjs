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
    /[\u0900-\u097f]/.test(q.questionText)&&q.questionText.includes('\\n')));
  for(const q of paper.questions){
   const original=translated.questions.find(item=>item.id===q.id);
   assert.equal(q.options[q.correctOption.charCodeAt(0)-65].split(' / ')[0],
    language==='both'?original.options[0]:original.optionsEn[0]);
  }
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
