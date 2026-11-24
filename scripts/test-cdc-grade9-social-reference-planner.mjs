import assert from 'node:assert/strict';
import {getSocial2078Reference,assertSocial2078ReferencePaper,planSocial2078ReferencePaper as plan} from '../cdc-grade9-social-reference-planner.mjs';
const grade=9,subject='Social Studies',r=getSocial2078Reference({grade,subject});
assert.equal(r.slots.length,24);assert.deepEqual(r.cognitiveMarks,[28,25,22]);assert.deepEqual(r.unitMarks,[5,5,8,6,11,11,9,9,6,5]);
assert.equal(r.slots.filter(s=>s.historicUnit===7).every(s=>s.currentUnit===8),true);
assert.equal(r.slots.filter(s=>s.historicUnit===8).every(s=>s.currentUnit===7),true);
assert.equal(r.slots.filter(s=>s.mapAlternative).length,1);assert.equal(r.slots.filter(s=>s.creativeTask).length,1);
const topics=Array.from({length:10},(_,i)=>'unit-'+(i+1));
// Synthetic structural fixtures; not approved textbook questions.
const bank=r.slots.flatMap((s,i)=>[0,1].map(v=>({id:i+'-'+v,gradeNumber:9,subject,topicId:'unit-'+s.currentUnit,unitCode:String(s.currentUnit),questionType:s.type,marks:s.marks,cognitiveLevel:['understanding','application','higher'][s.category],questionText:'परीक्षण प्रश्न '+i+' '+v,questionTextEn:'Synthetic prompt '+i+' '+v,answer:'उत्तर',answerEn:'Answer',status:'active',reviewStatus:'teacher_reviewed',reviewedBy:'fixture-only',...(s.creativeTask?{responseFormat:'dialogue'}:{}),...(s.mapAlternative?{mapChoices:['Nepal','Africa'].map(region=>({region,outlineMarks:2,labelMarks:5,textNe:'परीक्षण नक्सा',textEn:'Synthetic map prompt',answerNe:'नक्सा उत्तर',answerEn:'Synthetic map key',labels:Array.from({length:5},(_,j)=>({ne:'स्थान '+j,en:'Fixture place '+j}))}))}:{})})));
const args={grade,subject,questions:bank,selectedTopicIds:topics,rng:()=>.42};
const a=plan(args);assert.equal(a.ready,true,a.reason);assert.equal(a.paper.questions.length,24);assert.equal(a.currentCdcExactApproved,false);
assert.deepEqual(a.cognitiveMarks,[28,25,22]);
const b=plan({...args,previousSignature:a.signature,rng:()=>.61});assert.equal(b.ready,true,b.reason);assert.notEqual(a.signature,b.signature);
for(const mutate of [p=>p.questions.pop(),p=>p.questions[0].marks++,p=>p.questions[0].unitCode='99',p=>p.questions.find(q=>q.mapChoices).mapChoices.pop(),p=>p.questions.find(q=>q.mapChoices).mapChoices[0].labels.pop(),p=>p.questions.find(q=>q.responseFormat).responseFormat='short_answer',p=>p.questions[0].reviewStatus='draft',p=>p.fullMarks=74]){
 const bad=structuredClone(a.paper);mutate(bad);assert.throws(()=>assertSocial2078ReferencePaper(bad),/Social reference mismatch/);
}
assert.equal(plan({...args,questions:bank.filter(q=>q.unitCode!=='3')}).ready,false);
assert.equal(plan({...args,questions:bank.filter(q=>!q.mapChoices)}).ready,false);
assert.equal(plan({...args,selectedTopicIds:topics.slice(0,9)}).ready,false);
assert.equal(getSocial2078Reference({grade:9,subject:'Economics'}),null);
console.log('PASS Grade9 Social historical reference: 24 questions,75 marks, old/current unit mapping, map alternative, creative task, random set and rejection');
