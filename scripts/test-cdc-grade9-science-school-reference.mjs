import assert from 'node:assert/strict';
import {grade9ScienceSchoolReferenceBank as bank,planScienceSchoolReference as plan} from '../cdc-grade9-science-school-reference.mjs';
import {buildGrade9ReferencePreview,referencePreviewTopics} from '../cdc-grade9-reference-preview.mjs';
const grade=9,subject='Science and Technology',p=bank({grade,subject});
assert.equal(p.questions.length,80);
assert.equal(new Set(p.questions.map(q=>q.variantFamily)).size,40);
assert.equal(p.units[2].unitTitleEn,'Mushroom');
assert.equal(p.units[18].unitTitleEn,'Materials used in Agriculture');
const selectedTopicIds=referencePreviewTopics({grade,subject,questions:p.questions});
for(const language of ['ne','en','both']){
 const args={grade,subject,fullMarks:75,durationMinutes:180,language,questions:p.questions,selectedTopicIds,rng:()=>.32};
 const a=plan(args),b=plan({...args,previousSignature:a.signature});
 assert.equal(a.ready,true,a.reason);assert.equal(b.ready,true,b.reason);assert.notEqual(a.signature,b.signature);
 assert.equal(a.paper.questions.length,40);assert.equal(a.paper.questions.reduce((n,q)=>n+q.marks,0),75);assert.equal(a.currentCdcExactApproved,false);
 // Government PDF RS11167 page 1, full extraction run 45387386269:
 // original 2078 archive; this validates numerical structure only.
 const types=['mcq','very_short','short','long'],levels=['knowledge','understanding','application','higher'];
 const grid=[[2,4,2,2],[2,4,2,1],[2,3,5,4],[1,2,2,2]];
 for(const [i,type] of types.entries())assert.deepEqual(levels.map(level=>a.paper.questions.filter(q=>q.questionType===type&&q.cognitiveLevel===level).length),grid[i]);
 assert.deepEqual(levels.map(level=>a.paper.questions.filter(q=>q.cognitiveLevel===level).reduce((sum,q)=>sum+q.marks,0)),[12,22,22,19]);
 assert.deepEqual(Array.from({length:19},(_,i)=>a.paper.questions.filter(q=>String(q.unitCode)===String(i+1)).reduce((sum,q)=>sum+q.marks,0)),[3,3,2,3,8,3,5,2,4,7,6,2,7,6,3,3,2,3,3]);
 assert.equal(plan({...args,selectedTopicIds:selectedTopicIds.slice(0,18)}).ready,false);
 assert.equal(plan({...args,questions:p.questions.map(q=>({...q,marks:9}))}).ready,false);
 const preview=buildGrade9ReferencePreview(args);assert.equal(preview.ready,true);assert.match(preview.text,language==='ne'?/BESS २०७९ school annual reference/:/BESS 2079 school annual reference/);assert.doesNotMatch(preview.text,/\[[0-9०-९]+\]/,'Uniform marks belong in section headings');
 const totals=language==='ne'?['१० × १ = १०','९ × १ = ९','१४ × २ = २८','७ × ४ = २८']:['10 × 1 = 10','9 × 1 = 9','14 × 2 = 28','7 × 4 = 28'];
 for(const total of totals)assert.ok(preview.text.includes(total),'Missing science group marks: '+total);
 assert.deepEqual(preview.blocks.map(b=>b.displayNumber),[...Array.from({length:10},(_,i)=>i+1),...Array.from({length:30},(_,i)=>i+1)]);
}
console.log('PASS 80 real science bilingual variants, 40 questions, exact BESS school unit weights and cognitive category counts; no current CDC approval');

const mapped=p.questions.map(q=>({...q,topicId:'school-topic-'+q.unitCode}));
const mappedIds=referencePreviewTopics({grade,subject,questions:mapped});
const mappedArgs={grade,subject,fullMarks:75,durationMinutes:180,language:'both',questions:mapped,selectedTopicIds:mappedIds,rng:()=>.32};
assert.equal(buildGrade9ReferencePreview(mappedArgs).ready,true);
assert.equal(plan({...mappedArgs,questions:mapped.map(q=>({...q,questionText:'tampered'}))}).ready,false);
assert.throws(()=>plan({...mappedArgs,questions:mapped.map(q=>({...q,topicId:mappedIds[0]})),selectedTopicIds:[mappedIds[0]]}),/crosses unit/);
console.log('PASS school curriculum topic remapping without accepting modified question content');

// Real numerical electricity variants must display their own circuit and labels.
const {questionFigure}=await import('../cdc-optional-math-render.mjs');
const circuits=p.questions.filter(q=>q.unitCode==='11'&&q.questionType==='long');
assert.equal(circuits.length,2);
for(const q of circuits){
 const svg=questionFigure(q,'both');
 assert.match(svg,/<svg/);assert.match(svg,/12 V/);
 assert.match(svg,q.questionTextEn.includes('in series')?/Series circuit/:/Parallel circuit/);
 for(const value of q.questionTextEn.match(/\d+ Ω/g))assert.ok(svg.includes(value));
 const neLabels=[...questionFigure(q,'ne').matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]);
 const neDigits=s=>s.replace(/[0-9]/g,d=>'०१२३४५६७८९'[Number(d)]);
 assert.ok(neLabels.includes('१२ V'));
 for(const value of q.questionTextEn.match(/\d+ Ω/g))assert.ok(neLabels.includes(neDigits(value)));
 assert.ok(neLabels.every(label=>!/[0-9]/.test(label)),'Visible Nepali figure labels must use Nepali digits');
}
console.log('PASS real series and parallel circuit figures with variant-specific values');

// Independently transcribed user-supplied BESS 2079 screenshot (IMG_3505.png).
// Screenshot order groups ICT first; the portal follows textbook unit order.
const {readFileSync}=await import('node:fs');
const sourceRegister=JSON.parse(readFileSync(new URL('../data/cdc-question-paper-sources-2083.json',import.meta.url),'utf8'));
const e=sourceRegister.sources.find(s=>s.retrievalEvidence?.resource==='11167').schoolScreenshotEvidence;
assert.equal(e.yearBS,2079);assert.equal(e.units.length,19);
assert.equal(new Set(e.units.map(u=>u.portalUnit)).size,19);
assert.equal(e.officialCdcSource,false);assert.equal(e.currentEditionConfirmed,false);assert.equal(e.officialExamApproved,false);
assert.equal(e.units[1].portalUnit,13);
for(const u of e.units)assert.equal(p.units[u.portalUnit-1].unitTitleEn,u.portalTitle);
for(const seed of [.1,.7]){
 const result=plan({...mappedArgs,rng:()=>seed});assert.equal(result.ready,true,result.reason);
 const qs=result.paper.questions;
 assert.equal(result.paper.fullMarks,e.fullMarks);assert.equal(result.paper.durationMinutes,e.durationMinutes);
 for(const u of e.units)assert.equal(qs.filter(q=>Number(q.unitCode)===u.portalUnit).reduce((n,q)=>n+q.marks,0),u.marks,u.title);
 for(const [area,marks] of Object.entries(e.areaMarks))assert.equal(qs.filter(q=>e.units.some(u=>u.area===area&&u.portalUnit===Number(q.unitCode))).reduce((n,q)=>n+q.marks,0),marks,area);
 for(const [i,type] of e.questionTypes.entries()){
  const items=qs.filter(q=>q.questionType===type);assert.ok(items.every(q=>q.marks===e.marksEach[i]));
  assert.deepEqual(['knowledge','understanding','application','higher'].map(level=>items.filter(q=>q.cognitiveLevel===level).length),e.typeLevelCounts[i]);
 }
 assert.equal(result.currentCdcExactApproved,false);assert.equal(result.readyForLive,false);
}
console.log('PASS user BESS 2079 screenshot: 19 mapped topics, 4 area weights, 16 cognitive-count cells; school reference only');
