import assert from 'node:assert/strict';
import {grade9CompulsoryMathReferenceBank as bank} from '../cdc-grade9-compulsory-math-reference-bank.mjs';
import {planGrade9MathReference as plan} from '../cdc-grade9-compulsory-math-grouped.mjs';
import {assertGrade9ExamPaperMatches} from '../cdc-grade9-paper-grid-guard.mjs';
const grade=9,subject='Mathematics',pack=bank({grade,subject}),questions=pack.questions;
assert.equal(questions.length,32);
assert.equal(new Set(questions.map(q=>q.variantFamily)).size,16);
assert.equal(questions.reduce((n,q)=>n+q.subquestions.length,0),98);
assert.ok(questions.every(q=>q.reviewStatus==='draft'&&q.teacherReviewRequired&&!q.reviewedBy&&!q.officialCdcQuestion));
const topics=[...new Set(questions.map(q=>q.topicId))];
for(const language of ['ne','en','both']){
 const args={grade,subject,questions,selectedTopicIds:topics,language,rng:()=>.39};
 assert.equal(plan(args).ready,false);
 const a=plan({...args,allowOriginalReferenceDraft:true});
 assert.equal(a.ready,true,a.reason);assert.equal(a.paper.groups.length,16);assert.equal(a.itemCount,49);assert.equal(a.fullMarks,75);
 const b=plan({...args,allowOriginalReferenceDraft:true,previousSignature:a.signature,rng:()=>.61});
 assert.equal(b.ready,true,b.reason);assert.notEqual(b.signature,a.signature);
 assert.equal(a.currentCdcExactApproved,false);assert.equal(a.paper.referenceOnly,true);
 assert.throws(()=>assertGrade9ExamPaperMatches(a.paper),/verified subject/);
}
console.log('PASS actual original Grade 9 math reference bank: 32 groups,98 subitems, six distinct bilingual structural drafts');
