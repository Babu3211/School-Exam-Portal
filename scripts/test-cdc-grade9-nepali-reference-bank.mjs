import assert from 'node:assert/strict';
import {grade9NepaliReferenceBank as bank} from '../cdc-grade9-nepali-reference-bank.mjs';
import {planNepali2078ReferencePaper as plan} from '../cdc-grade9-nepali-grouped-planner.mjs';
import {getNepali2078Reference} from '../cdc-grade9-nepali-model-2078.mjs';
const grade=9,subject='Nepali',p=bank({grade,subject}),slots=getNepali2078Reference().slots;
assert.equal(p.questions.length,54);
assert.equal(p.coveredMarks,71);
assert.equal(new Set(p.questions.map(q=>q.id)).size,54);
for(const q of p.questions){
 const s=slots.find(s=>s.skill===q.skill);assert.ok(s);assert.equal(q.marks,s.marksPerChoice);
 if(s.componentMarks)assert.deepEqual(q.components.map(x=>x.marks),s.componentMarks);
 assert.equal(q.reviewStatus,'draft');assert.equal(q.officialCdcQuestion,false);assert.ok(q.answer);
}
const args={grade,subject,questions:p.questions,selectedTopicIds:[...new Set(p.questions.map(q=>q.topicId))],allowOriginalReferenceDraft:true};
const r=plan(args);assert.equal(r.ready,false);
const missing=[...new Set(r.shortages.map(s=>s.group))].sort((a,b)=>a-b);
assert.deepEqual(missing,[15]);
assert.equal(slots.filter(s=>!missing.includes(s.number)).reduce((n,s)=>n+s.marks,0),71);
assert.equal(plan({...args,allowOriginalReferenceDraft:false}).shortages.length,slots.reduce((n,s)=>n+s.offered,0));
assert.equal(bank({grade:8,subject}).questions.length,0);
assert.ok(p.questions.filter(q=>q.sourceKind==='textbook').every(q=>q.sourceEdition==='२०८२'&&q.sourcePage>0));
assert.equal(p.questions.filter(q=>q.sourceKind==='textbook').length,22);
assert.equal(p.units[6].unitTitle.split(' / ')[0],'कालजित र अजङ्गुको राक्षसको कथा');
console.log('PASS 54 actual Nepali reference tasks; 71 marks covered; notes/summary passage and current Grid approval remain pending');

for(const q of p.questions){
 if(['vocabulary_identification','word_class','word_formation','grammar_passage','unseen_passage'].includes(q.skill))assert.ok(q.passage,'Missing contextual passage: '+q.id);
 if(q.skill==='sentence_transformation')assert.match(q.components[2].text,/वाच्य/);
 if(q.skill==='unseen_passage')assert.match(q.components[4].text,/वाक्यमा प्रयोग/);
}
console.log('PASS contextual grammar task format and required transformation/vocabulary categories in authored Nepali drafts');
