import assert from 'node:assert/strict';
import {getCdcOptionalMathGuide,isOptionalMathSubject,optionalMathAreaTopics}
 from '../cdc-optional-math-2082.mjs';
for(const grade of [9,10]){
 for(const subject of ['Optional Mathematics','ऐच्छिक गणित','Elective Math']){
  const source=getCdcOptionalMathGuide({grade,subject});
  assert.ok(source,'CDC Grade '+grade+' optional math grid must load by subject');
  assert.equal(source.fullMarks,75);
  assert.equal(source.durationMinutes,180);
  assert.equal(source.sourceVersion,'2082');
  assert.match(source.sourceUrl,/giwmscdnone\.gov\.np\/media\/pdf_upload/);
  assert.equal(source.automaticExactGenerationReady,false);
  assert.equal(source.requiresCompositeQuestionEngine,true);
  assert.equal(source.areas.length,6);
  assert.deepEqual(source.areas.map(a=>a.totalMarks),[17,17,20,7,7,7]);
  assert.deepEqual(source.areas.map(a=>a.objectiveCount),[2,3,3,1,1,1]);
  assert.deepEqual(source.areas.map(a=>a.wcaQuestionCount),[3,3,3,1,1,1]);
  assert.deepEqual(source.questionGroups.map(g=>[g.code,g.questionCount,g.totalMarks]),[
   ['objective',11,11],['WCA',12,40],['CCA',4,24]]);
  assert.deepEqual(source.cognitiveDistribution,{
   knowledge:16,understanding:24,application:40,higher:20});
  assert.equal(source.compositeRules.minSubquestionsPerQuestion,2);
  assert.equal(source.compositeRules.maxSubquestionsPerQuestion,4);
  const topics=optionalMathAreaTopics(grade,subject);
  assert.equal(topics.length,6);
  assert.equal(new Set(topics.map(x=>x.id)).size,6);
  assert.equal(topics.reduce((sum,x)=>sum+source.areas.find(a=>a.unitCode===x.unitCode).totalMarks,0),75);
  source.areas[0].totalMarks=0;
  assert.equal(getCdcOptionalMathGuide({grade,subject}).areas[0].totalMarks,17,
   'returned copies must never corrupt the source grid');
 }
}
for(const subject of ['Compulsory Mathematics','Mathematics','Science and Technology',
 'Computer Science','अनिवार्य गणित','ऐच्छिक कम्प्युटर विज्ञान']){
 assert.equal(isOptionalMathSubject(subject),false,subject+' must not inherit optional Math grid');
 assert.equal(getCdcOptionalMathGuide({grade:9,subject}),null);
}
for(const grade of [6,7,8,11]){
 assert.equal(getCdcOptionalMathGuide({grade,subject:'Optional Mathematics'}),null);
}
console.log('PASS official CDC 2082 Grades 9/10 Optional Math: 75 marks, 27 grouped questions, 6 areas and fail-closed grouped generator');
