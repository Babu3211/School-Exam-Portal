import assert from 'node:assert/strict';
import {grade9EnglishReferenceBank} from '../cdc-grade9-english-reference-bank.mjs';
import {planGrade9EnglishReferencePaper as plan} from '../cdc-grade9-english-grouped-planner.mjs';
import {PUBLIC_DOMAIN_SEEN_PROSE as data} from '../cdc-grade9-english-seen-prose-data.mjs';
const grade=9,subject='English',pack=grade9EnglishReferenceBank({grade,subject});
assert.ok([0,2].includes(data.length));
assert.equal(pack.questions.length,18+data.length);
assert.ok(pack.questions.every(q=>q.reviewStatus==='draft'&&!q.reviewedBy&&q.teacherReviewRequired&&!q.officialCdcQuestion));
const topics=[...new Set(pack.questions.map(q=>q.topicId))];
const args={grade,subject,questions:pack.questions,selectedTopicIds:topics};
assert.equal(plan(args).shortages.length,10);
const r=plan({...args,allowOriginalReferenceDraft:true});
assert.deepEqual(r.shortages||[],data.length?[]:['reading2']);
assert.equal(r.ready,!!data.length);
if(!data.length)assert.equal(r.paper,undefined);
assert.equal(r.currentCdcExactApproved,false);
for(const q of pack.questions.filter(q=>q.slot==='contextual_mcq')){
 assert.equal(q.items.reduce((s,i)=>s+i.marks,0),5);
 assert.equal(q.items.length,10);
}
for(const v of [0,1]){
 const qs=pack.questions.filter(q=>q.id.endsWith('_'+v));
 assert.equal(qs.reduce((s,q)=>s+q.marks,0),data.length?75:65);
 const reading=qs.filter(q=>q.slot.startsWith('reading'));
 assert.equal(reading.reduce((s,q)=>s+q.items.length,0),data.length?40:30);
 const counts={};for(const q of reading)for(const i of q.items)counts[i.domain]=(counts[i.domain]||0)+1;
 assert.deepEqual(counts,data.length?{literal:16,reorganization:8,inference:8,evaluation:3,vocabulary:5}:{literal:12,reorganization:5,inference:6,evaluation:2,vocabulary:5});
}
assert.equal(grade9EnglishReferenceBank({grade:8,subject}).questions.length,0);
console.log('PASS English reference groups with explicit seen prose retrieval status');

// Verify the reviewed contextual grammar alternatives remain unambiguous
// in the intended past narrative and do not change the 11-mark grid.
const museum=pack.questions.find(q=>q.slot==='contextual_mcq'&&q.passage.includes('old museum'));
assert.ok(museum);
assert.equal(museum.items[1].answer,'at');assert.ok(!museum.items[1].options.includes('by'));
assert.equal(museum.items[8].answer,'was carrying');
assert.match(museum.passage,/that day/);
const wh=pack.questions.filter(q=>q.slot==='transformation').flatMap(q=>q.items).filter(x=>x.grammar==='wh_question');
assert.equal(wh.length,2);assert.ok(wh.every(x=>!x.text.includes('underlined')&&x.text.includes('Rewrite as a question')));
console.log('PASS targeted English grammar contextual agreement and clear WH-question instructions');
