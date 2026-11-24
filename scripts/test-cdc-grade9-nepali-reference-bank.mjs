import assert from 'node:assert/strict';
import {grade9NepaliReferenceBank as bank} from '../cdc-grade9-nepali-reference-bank.mjs';
import {planNepali2078ReferencePaper as plan} from '../cdc-grade9-nepali-grouped-planner.mjs';
import {getNepali2078Reference} from '../cdc-grade9-nepali-model-2078.mjs';
const grade=9,subject='Nepali',p=bank({grade,subject}),slots=getNepali2078Reference().slots;
assert.equal(p.questions.length,32);
assert.equal(p.coveredMarks,43);
assert.equal(new Set(p.questions.map(q=>q.id)).size,32);
for(const q of p.questions){
 const s=slots.find(s=>s.skill===q.skill);assert.ok(s);assert.equal(q.marks,s.marksPerChoice);
 if(s.componentMarks)assert.deepEqual(q.components.map(x=>x.marks),s.componentMarks);
 assert.equal(q.reviewStatus,'draft');assert.equal(q.officialCdcQuestion,false);assert.ok(q.answer);
}
const args={grade,subject,questions:p.questions,selectedTopicIds:[...new Set(p.questions.map(q=>q.topicId))],allowOriginalReferenceDraft:true};
const r=plan(args);assert.equal(r.ready,false);
const missing=[...new Set(r.shortages.map(s=>s.group))].sort((a,b)=>a-b);
assert.deepEqual(missing,[1,3,4,15,16,17,18,19]);
assert.equal(slots.filter(s=>!missing.includes(s.number)).reduce((n,s)=>n+s.marks,0),43);
assert.equal(plan({...args,allowOriginalReferenceDraft:false}).shortages.length,slots.reduce((n,s)=>n+s.offered,0));
assert.equal(bank({grade:8,subject}).questions.length,0);
console.log('PASS 32 actual original Nepali reference tasks; 43 marks covered; textbook-dependent slots fail closed');
