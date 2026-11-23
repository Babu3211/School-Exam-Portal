import assert from 'node:assert/strict';
import {originalOptionalMathPracticeBank,isOriginalMathOfflineDraft}
 from '../cdc-optional-math-original-practice.mjs';
import {getCdcOptionalMathGuide,optionalMathAreaTopics}
 from '../cdc-optional-math-2082.mjs';
import {inspectCdcOptionalMathPaper} from '../cdc-optional-math-composite.mjs';
for(const grade of [9,10]){
 for(const subject of ['Optional Mathematics','ऐच्छिक गणित']){
  const pack=originalOptionalMathPracticeBank({grade,subject});
  const guide=getCdcOptionalMathGuide({grade,subject});
  const topicIds=optionalMathAreaTopics(grade,subject).map(x=>x.id+'_0');
  assert.equal(pack.questions.length,54);
  assert.equal(pack.teacherReviewRequired,true);
  assert.equal(pack.officialCdcQuestions,false);
  assert.equal(new Set(pack.questions.map(q=>q.id)).size,54);
  assert.equal(new Set(pack.questions.map(q=>q.variantFamily)).size,27);
  assert.ok(pack.questions.every(q=>isOriginalMathOfflineDraft(q)));
  assert.ok(pack.questions.every(q=>q.reviewStatus==='formula_verified_draft'));
  assert.ok(pack.questions.every(q=>q.provenance==='smss_offline_original_maths_v1'));
  assert.ok(pack.questions.every(q=>q.subquestions.every(s=>s.answerNe&&s.answerEn)));
  const objective=pack.questions.filter(q=>q.group==='objective');
  assert.equal(objective.length,22,'11 one-mark MCQ problems across two variants');
  for(const q of objective){
   const part=q.subquestions[0];
   assert.equal(part.optionsNe.length,4);
   assert.equal(part.optionsEn.length,4);
   assert.equal(new Set(part.optionsNe).size,4);
   assert.ok(['A','B','C','D'].includes(part.correctOption));
   assert.equal(part.optionsNe['ABCD'.indexOf(part.correctOption)],part.answerNe);
   assert.equal(part.optionsEn['ABCD'.indexOf(part.correctOption)],part.answerEn);
  }
  const selected=inspectCdcOptionalMathPaper({
   guide,questions:pack.questions,selectedTopicIds:topicIds,
   language:'both',allowFormulaVerifiedDraft:true,rng:()=>0.4
  });
  assert.equal(selected.ready,true,selected.reason);
  assert.equal(selected.questions.length,27);
  assert.equal(selected.teacherReviewRequired,true);
  assert.equal(selected.sourceApprovedByCdc,false);
  assert.deepEqual(selected.groupMarks,{objective:11,WCA:40,CCA:24});
  assert.deepEqual(selected.areaMarks,{'1':17,'2':17,'3':20,'4':7,'5':7,'6':7});
  assert.deepEqual(selected.cognitiveMarks,{
   knowledge:12,understanding:18,application:30,higher:15
  });
  assert.equal(new Set(selected.questions.map(q=>q.variantFamily)).size,27);
  const second=inspectCdcOptionalMathPaper({
   guide,questions:pack.questions,selectedTopicIds:topicIds,
   language:'both',previousSignature:selected.signature,
   allowFormulaVerifiedDraft:true,rng:()=>0.6
  });
  assert.equal(second.ready,true,second.reason);
  assert.notEqual(second.signature,selected.signature);
  const noDraftOptIn=inspectCdcOptionalMathPaper({
   guide,questions:pack.questions,selectedTopicIds:topicIds,
   language:'both',rng:()=>0.4
  });
  assert.equal(noDraftOptIn.ready,false,'Formula drafts are off by default');
  const forged=pack.questions.map(q=>({...q}));
  assert.ok(forged.every(q=>!isOriginalMathOfflineDraft(q)));
  const rejected=inspectCdcOptionalMathPaper({
   guide,questions:forged,selectedTopicIds:topicIds,
   language:'both',allowFormulaVerifiedDraft:true,rng:()=>0.4
  });
  assert.equal(rejected.ready,false,'Copied Firestore-style draft metadata cannot forge offline verification');
  console.log('PASS Grade '+grade+' '+subject+': 54 original offline bilingual math drafts');
 }
}
assert.equal(originalOptionalMathPracticeBank({grade:8,subject:'Optional Mathematics'}).questions.length,0);
assert.equal(originalOptionalMathPracticeBank({grade:9,subject:'Compulsory Mathematics'}).questions.length,0);
console.log('PASS randomized 27-question CDC structure, no repeat, no forged original-bank review status');
