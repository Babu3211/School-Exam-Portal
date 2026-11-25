import assert from 'node:assert/strict';
import {grade9ComputerOriginalBank}
 from '../cdc-grade9-computer-original-practice.mjs';
import {getBundledComputerGrid,bundledComputerUnitTopics}
 from '../cdc-verified-computer-grids.mjs';
import {buildAutomaticQuestionPaper,isQuestionReadyForLanguage}
 from '../cdc-question-autogen.mjs';
for(const subject of ['Optional Computer Science','ऐच्छिक कम्प्युटर विज्ञान']){
 const blueprint=getBundledComputerGrid({grade:9,subject,fullMarks:50});
 assert.ok(blueprint);
 const pack=grade9ComputerOriginalBank({subject});
 assert.equal(pack.questions.length,50);
 assert.equal(pack.units.length,7);
 assert.equal(pack.teacherReviewRequired,true);
 assert.equal(pack.officialCdcQuestions,false);
 assert.equal(new Set(pack.questions.map(q=>q.id)).size,50);
 assert.equal(new Set(pack.questions.map(q=>q.questionText)).size,50);
 assert.ok(pack.questions.every(q=>q.officialCdcQuestion===false&&
  q.teacherReviewRequired&&q.gradeNumber===9&&q.subject===subject));
 for(const language of ['ne','en','both']){
  assert.ok(pack.questions.every(q=>isQuestionReadyForLanguage(q,language)),
   'Missing '+language+' reviewed-language original question / key');
 }
 const bySlot=blueprint.unitGrid.flatMap(row=>Array.from({length:row.count},()=>row));
 assert.equal(bySlot.length,25);
 for(const row of bySlot){
  const eligible=pack.questions.filter(q=>
   q.unitCode===row.unitCode&&q.questionType===row.type&&
   q.marks===row.marks&&q.cognitiveLevel===row.cognitiveLevel);
  assert.ok(eligible.length>=2,
   'Missing two alternatives for CDC '+JSON.stringify(row));
 }
 const mcqs=pack.questions.filter(q=>q.questionType==='mcq');
 assert.equal(mcqs.length,20);
 assert.ok(mcqs.every(q=>q.options.length===4&&
  q.optionsEn.length===4&&['A','B','C','D'].includes(q.correctOption)));
 const topicIds=bundledComputerUnitTopics(9,subject).map(unit=>unit.id+'_0');
 const first=buildAutomaticQuestionPaper({
  questions:pack.questions,topicIds,fullMarks:50,
  language:'both',blueprint,requireExactGrid:true,
  gradeNumber:9,subject,rng:()=>0.39
 });
 assert.equal(first.questions.length,25);
 assert.equal(first.exactGridMatched,true);
 assert.equal(first.teacherReviewRequired,true);
 assert.deepEqual(first.questions.reduce((s,q)=>s+q.marks,0),50);
 assert.equal(first.questions.filter(q=>q.questionType==='mcq').length,10);
 assert.equal(first.questions.filter(q=>q.questionType==='short').length,10);
 assert.equal(first.questions.filter(q=>q.questionType==='long').length,5);
 assert.equal(new Set(first.questions.map(q=>q.unitCode)).size,7);
 const second=buildAutomaticQuestionPaper({
  questions:pack.questions,topicIds,fullMarks:50,
  language:'both',blueprint,requireExactGrid:true,
  gradeNumber:9,subject,rng:()=>0.61,previousSignature:first.signature
 });
 assert.notEqual(first.signature,second.signature);
 assert.throws(()=>buildAutomaticQuestionPaper({
  questions:pack.questions,topicIds,fullMarks:50,
  language:'both',blueprint,requireExactGrid:true,gradeNumber:10,
  subject,rng:()=>0.4}),/different class|class/i);
 console.log('PASS Grade9 '+subject+': 25 exact CDC slots, 50 original bilingual exercises,');
 console.log('     two different 50-mark papers, teacher review required and no cross-grade reuse');
}
assert.equal(grade9ComputerOriginalBank({subject:'Science and Technology'}).questions.length,0);
assert.equal(grade9ComputerOriginalBank({subject:'Computer Engineering'}).questions.length,0);
console.log('PASS original Grade9 Computer Science practice not represented as CDC authored content');
