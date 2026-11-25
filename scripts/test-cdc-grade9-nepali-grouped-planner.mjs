import assert from 'node:assert/strict';
import {getNepali2078Reference} from '../cdc-grade9-nepali-model-2078.mjs';
import {planNepali2078ReferencePaper as plan} from '../cdc-grade9-nepali-grouped-planner.mjs';
const subject='अनिवार्य नेपाली',topics=['topic-a','topic-b'];
const r=getNepali2078Reference();
const genres={guided_writing:['story','speech'],functional_writing:['application','notice'],textbook_comprehension:['poem','essay','biography'],essay:['personal','objective','objective']};
// Synthetic fixtures exercise structure only, never deployed into a bank.
const bank=r.slots.flatMap(s=>Array.from({length:s.offered},(_,i)=>[0,1].map(v=>({
 id:s.number+'-'+i+'-'+v,gradeNumber:9,subject,topicId:topics[i%2],status:'active',
 reviewStatus:'teacher_reviewed',reviewedBy:'fixture-only',skill:s.skill,cognitiveLevel:s.cognitiveLevel,
 marks:s.marksPerChoice,text:'परीक्षण प्रश्न '+s.number+' '+i+' '+v,answer:'परीक्षण उत्तर',
 genre:genres[s.skill]?.[i],sourceKind:s.skill==='unseen_passage'?'original_unseen':'textbook',
 sourceTitle:'Synthetic fixture — not a textbook',sourceEdition:'fixture',
 sourceUrl:'https://moecdc.gov.np/',sourcePage:1,passage:'परीक्षणका लागि छोटो अनुच्छेद।',
 components:s.componentMarks?.map((marks,j)=>({text:'उपप्रश्न '+j,answer:'उत्तर',marks}))
}))).flat());
const args={grade:9,subject,questions:bank,selectedTopicIds:topics,rng:()=>0.42};
const a=plan(args);
assert.equal(a.ready,true,a.reason);assert.equal(a.paper.groups.length,20);
assert.equal(a.paper.groups.reduce((sum,g)=>sum+g.marks,0),75);
assert.equal(a.currentCdcExactApproved,false);assert.equal(a.readyForLive,false);
const b=plan({...args,previousSignature:a.signature,rng:()=>0.61});
assert.equal(b.ready,true,b.reason);assert.notEqual(b.signature,a.signature);
assert.equal(plan({...args,avoidSignatures:[a.signature,b.signature]}).ready,true);
for(const skill of ['textbook_comprehension','guided_writing','essay','unseen_passage']){
 const result=plan({...args,questions:bank.filter(q=>q.skill!==skill)});
 assert.equal(result.ready,false);assert.ok(result.shortages.some(s=>s.skill===skill));assert.equal(result.paper,undefined);
}
const noSource=plan({...args,questions:bank.map(q=>q.skill==='notes_and_summary'?{...q,sourcePage:0}:q)});
assert.equal(noSource.ready,false);
assert.equal(plan({...args,questions:bank.map(q=>({...q,reviewStatus:'draft'}))}).ready,false);
assert.equal(plan({...args,questions:bank.map(q=>({...q,subject:'English'}))}).ready,false);
assert.equal(plan({...args,selectedTopicIds:['missing']}).ready,false);
assert.throws(()=>plan({...args,fullMarks:50}),/75-mark/);
assert.throws(()=>plan({...args,grade:10}),/Grade 9/);
assert.throws(()=>plan({...args,maxVisits:1}),/safe limit/);
console.log('PASS 75-mark Nepali reference-only randomized grouped planner, genre choices, reviewed textbook evidence, no partial papers and repeat exclusion');
