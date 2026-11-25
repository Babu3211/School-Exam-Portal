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
 for(const r of [a,b]){assert.equal(r.paper.questions.length,22);assert.equal(r.paper.questions.reduce((n,q)=>n+q.marks,0),75);
 // CDC 2076 SEE optional Environment Grid pp.69–70 matches the
 // Grade 9 school-model aggregate only. Never transfer old SEE unit
 // and cognitive allocations or certify the present Grade 9 Grid.
 const types=['very_short','short','long'];
 assert.deepEqual(types.map(type=>r.paper.questions.filter(q=>q.questionType===type).length),[11,8,3]);
 assert.deepEqual(types.map(type=>r.paper.questions.filter(q=>q.questionType===type).reduce((sum,q)=>sum+q.marks,0)),[11,40,24]);
 assert.equal(r.paper.durationMinutes,135);
 assert.equal(r.paper.referenceOnly,true);assert.equal(new Set(r.paper.questions.map(q=>q.topicId)).size,9);assert.equal(r.currentCdcExactApproved,false);assert.throws(()=>assertGrade9ExamPaperMatches(r.paper),/verified subject/);}
 const preview=buildGrade9ReferencePreview(args);assert.equal(preview.ready,true);assert.match(preview.text,/School model aggregate pattern only/);
 assert.equal(preview.readyForLive,false);assert.equal(preview.groupCount,22);
 assert.equal(plan({...args,selectedTopicIds:selectedTopicIds.slice(0,2)}).ready,false);
}
assert.equal(bank({grade:8,subject}).questions.length,0);
console.log('PASS environment school-model 75-mark bilingual review drafts, 9 units, two distinct sets in three languages; official guard retained');

console.log('PASS historic CDC SEE aggregate comparison only; current Grade 9 Environment Grid remains unapproved.');

// Complementary one-mark variants must not ask for the same answer in the same unit.
for(const unit of p.units){
 const items=p.questions.filter(q=>q.unitId===unit.id&&q.marks===1);
 assert.equal(items.length,2);
 assert.notEqual(items[0].answerEn.toLowerCase().trim(),items[1].answerEn.toLowerCase().trim());
 assert.notEqual(items[0].answer.trim(),items[1].answer.trim());
}
console.log('PASS distinct complementary one-mark environment questions in every unit');

const {readFileSync}=await import('node:fs');
const sourceRegister=JSON.parse(readFileSync(new URL('../data/cdc-question-paper-sources-2083.json',import.meta.url),'utf8'));
const school=sourceRegister.sources.find(s=>s.schoolSyllabus2080Evidence)?.schoolSyllabus2080Evidence;
assert.equal(school.officialCdcSource,false);
assert.equal(school.sourceToPortalUnitMappingVerified,false);
assert.equal(school.sourceUnitCount,10);
assert.equal(p.units.length,school.portalTextbookUnitCount);
for(const seed of [.19,.83]){
 const result=plan({grade,subject,fullMarks:school.fullMarks,durationMinutes:school.durationMinutes,language:'both',questions:p.questions,selectedTopicIds,rng:()=>seed});
 assert.equal(result.ready,true,result.reason);
 const types=['very_short','short','long'];
 for(const [j,type] of types.entries()){
  const questions=result.paper.questions.filter(q=>q.questionType===type);
  assert.equal(questions.length,school.questionCounts[j]);
  assert.ok(questions.every(q=>q.marks===school.marksEach[j]));
 }
 assert.equal(result.currentCdcExactApproved,false);
 assert.equal(result.readyForLive,false);
}
console.log('PASS Environment school syllabus 2080 aggregate corroboration; no claim of unit mapping, alternatives or current CDC approval');
