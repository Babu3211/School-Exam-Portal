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

const {grade9NepaliPracticeSummaryDrafts}=await import('../cdc-grade9-nepali-reference-bank.mjs');
const {buildGrade9ReferencePreview,referencePreviewTopics}=await import('../cdc-grade9-reference-preview.mjs');
const {assertGrade9ExamPaperMatches}=await import('../cdc-grade9-paper-grid-guard.mjs');
const summary=grade9NepaliPracticeSummaryDrafts({grade,subject});
assert.equal(summary.length,2);
const all=[...p.questions,...summary],allTopics=referencePreviewTopics({grade,subject,questions:all});
const practiceArgs={...args,fullMarks:75,durationMinutes:180,language:'ne',questions:all,selectedTopicIds:allTopics,allowOriginalSummaryPractice:true,rng:()=>.42};
assert.equal(plan({...practiceArgs,allowOriginalSummaryPractice:false}).ready,false);
const a=plan(practiceArgs);
assert.equal(a.ready,true,a.reason);
assert.equal(a.practiceSubstitution,true);
assert.equal(a.paper.groups.length,20);
assert.equal(a.paper.groups.reduce((n,g)=>n+g.marks,0),75);
// Government RS11168 extraction, run 45395601881, p.1 confirms
// 75 marks / 3 hours. Legible task-row marks cross-check the existing
// historical reference without guessing missing columns or approving 2083.
const recoveredSkillMarks={spelling_choice:1,sentence_editing:2,word_class:3,tense_aspect:2,verb_mood:2,sentence_transformation:4,grammar_passage:4,functional_writing:4,critical_response:7,essay:7};
for(const [skill,marks] of Object.entries(recoveredSkillMarks)){
 const group=a.paper.groups.find(g=>g.skill===skill);
 assert.ok(group,skill);assert.equal(group.marks,marks,skill);
}
assert.equal(a.paper.durationMinutes,180);
assert.equal(a.paper.referenceOnly,true);
assert.equal(a.paper.groups[14].choices[0].practiceSubstitution,true);
assert.equal(a.readyForLive,false);
assert.throws(()=>assertGrade9ExamPaperMatches(a.paper),/verified subject/);
const b=buildGrade9ReferencePreview(practiceArgs);
assert.equal(b.ready,true,b.reason);
assert.match(b.text,/मौलिक अपठित गद्यांश/);
assert.match(b.text,/बुँदाटिपोट/);
assert.match(b.text,/विकल्पमध्ये/);
assert.equal(b.readyForLive,false);
assert.notEqual(buildGrade9ReferencePreview({...practiceArgs,previousSignature:b.signature,rng:()=>.61}).signature,b.signature);
console.log('PASS 75-mark Nepali practice review preview, explicit original summary substitution, all optional choices, official exam still blocked');

// Deliberately incorrect spellings are assessment inputs, not editing mistakes.
const spellingEdits=p.questions.filter(q=>q.skill==='sentence_editing');
assert.equal(spellingEdits.length,2);
assert.ok(spellingEdits.some(q=>q.components.some(c=>c.text==='पानि'&&c.answer==='पानी')));
assert.ok(spellingEdits.some(q=>q.components.some(c=>c.text==='जिवन'&&c.answer==='जीवन')));
const classes=p.questions.filter(q=>q.skill==='word_class');
assert.ok(classes.some(q=>q.passage.includes('(राम) विद्यालय जान्छ')));
const grammar=p.questions.filter(q=>q.skill==='grammar_passage');
assert.ok(grammar.every(q=>q.components.some(c=>c.text.includes('कारक र विभक्ति छुट्याउनुहोस्।'))));
console.log('PASS targeted Nepali editorial corrections; intentionally incorrect test words preserved');
