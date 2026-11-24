import assert from 'node:assert/strict';
import {grade9EnvironmentReferenceBank as bank,planEnvironmentSchoolReference as plan} from '../cdc-grade9-environment-reference-bank.mjs';
import {buildGrade9ReferencePreview,referencePreviewTopics} from '../cdc-grade9-reference-preview.mjs';
import {assertGrade9ExamPaperMatches} from '../cdc-grade9-paper-grid-guard.mjs';
const grade=9,subject='Environmental Science',p=bank({grade,subject});
assert.equal(p.added.length,9);assert.equal(p.questions.length,36);
const selectedTopicIds=referencePreviewTopics({grade,subject,questions:p.questions});assert.equal(selectedTopicIds.length,9);
for(const language of ['ne','en','both']){
 const args={grade,subject,fullMarks:75,durationMinutes:135,language,questions:p.questions,selectedTopicIds,rng:()=>.31};
 const a=plan(args),b=plan({...args,previousSignature:a.signature,rng:()=>.71});
 assert.equal(a.ready,true,a.reason);assert.equal(b.ready,true,b.reason);assert.notEqual(a.signature,b.signature);
 for(const r of [a,b]){assert.equal(r.paper.questions.length,22);assert.equal(r.paper.questions.reduce((n,q)=>n+q.marks,0),75);assert.equal(new Set(r.paper.questions.map(q=>q.topicId)).size,9);assert.equal(r.currentCdcExactApproved,false);assert.throws(()=>assertGrade9ExamPaperMatches(r.paper),/verified subject/);}
 const preview=buildGrade9ReferencePreview(args);assert.equal(preview.ready,true);assert.match(preview.text,/School model aggregate pattern only/);
 assert.equal(preview.readyForLive,false);assert.equal(preview.groupCount,22);
 assert.equal(plan({...args,selectedTopicIds:selectedTopicIds.slice(0,2)}).ready,false);
}
assert.equal(bank({grade:8,subject}).questions.length,0);
console.log('PASS environment school-model 75-mark bilingual review drafts, 9 units, two distinct sets in three languages; official guard retained');
