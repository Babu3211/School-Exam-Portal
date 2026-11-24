import assert from 'node:assert/strict';
import {grade9SocialReferenceBank} from '../cdc-grade9-social-reference-bank.mjs';
import {planSocial2078ReferencePaper as plan} from '../cdc-grade9-social-reference-planner.mjs';
import {assertGrade9ExamPaperMatches} from '../cdc-grade9-paper-grid-guard.mjs';
const grade=9,subject='Social Studies',bank=grade9SocialReferenceBank({grade,subject});
assert.equal(bank.questions.length,48);
assert.equal(new Set(bank.questions.map(q=>q.referenceVariantFamily)).size,24);
assert.ok(bank.questions.every(q=>q.reviewStatus==='draft'&&!q.reviewedBy&&q.teacherReviewRequired&&!q.officialCdcQuestion));
const topics=bank.units.map(u=>u.id+'_0');
for(const language of ['ne','en','both']){
 const args={grade,subject,questions:bank.questions,selectedTopicIds:topics,language,rng:()=>.39};
 assert.equal(plan(args).ready,false,'Draft must never masquerade as teacher-reviewed');
 const a=plan({...args,allowOriginalReferenceDraft:true});
 assert.equal(a.ready,true,a.reason);assert.equal(a.paper.questions.length,24);assert.equal(a.fullMarks,75);
 assert.equal(a.currentCdcExactApproved,false);assert.equal(a.paper.referenceOnly,true);
 const b=plan({...args,allowOriginalReferenceDraft:true,previousSignature:a.signature,rng:()=>.61});
 assert.equal(b.ready,true,b.reason);assert.notEqual(a.signature,b.signature);
 assert.throws(()=>assertGrade9ExamPaperMatches(a.paper),/verified subject/);
}
console.log('PASS six actual distinct bilingual social reference papers using original questions; official exam remains blocked');

// CDC 2082 curriculum p.4: Grade 9 foreign policy/BIMSTEC, Grade 10 UN;
// family budgeting belongs to Grade 9, tourism to Grade 10.
const unit9=bank.questions.filter(q=>q.unitCode==='9');
assert.equal(unit9.length,6);
assert.ok(unit9.every(q=>/BIMSTEC|foreign policy|Panchsheel/i.test(q.questionTextEn)));
assert.ok(unit9.every(q=>!/United Nations|SAARC/i.test(q.questionTextEn)));
assert.ok(bank.questions.some(q=>q.unitCode==='7'&&/family budget plan/i.test(q.questionTextEn)));
assert.ok(bank.questions.filter(q=>q.unitCode==='7').every(q=>!/tourism/i.test(q.questionTextEn)));
assert.ok(bank.questions.some(q=>q.unitCode==='8'&&/Anglo-Nepal War/.test(q.questionTextEn)));
assert.ok(bank.questions.some(q=>q.unitCode==='8'&&/Greek and Roman civilizations/.test(q.questionTextEn)));
assert.ok(bank.questions.some(q=>q.unitCode==='10'&&/demography/.test(q.questionTextEn)));
console.log('PASS selected Grade 9 social reference content corrections from CDC 2082 curriculum p.4; historical Grid remains unapproved');

const {buildGrade9ReferencePreview}=await import('../cdc-grade9-reference-preview.mjs');
const {assertSocial2078ReferencePaper}=await import('../cdc-grade9-social-reference-planner.mjs');
for(const language of ['ne','en','both']){
 const args={grade,subject,questions:bank.questions,selectedTopicIds:topics,language,allowOriginalReferenceDraft:true,currentCurriculumMapPractice:true,rng:()=>.39};
 const result=plan(args);assert.equal(result.ready,true,result.reason);
 const task=result.paper.questions.find(q=>q.mapChoices);
 assert.deepEqual(task.mapChoices.map(c=>c.region),['Nepal','Nepal']);
 assert.equal(new Set(task.mapChoices.flatMap(c=>c.labels.map(l=>l.en))).size,10);
 assert.equal(result.paper.questions.reduce((n,q)=>n+q.marks,0),75);
 assert.throws(()=>assertSocial2078ReferencePaper(result.paper,{allowOriginalReferenceDraft:true}),/map alternative/);
 assert.throws(()=>assertGrade9ExamPaperMatches(result.paper),/verified subject/);
 const preview=buildGrade9ReferencePreview({...args,fullMarks:75,durationMinutes:180});assert.equal(preview.ready,true,preview.reason);
 assert.match(preview.text,/Nepal-only map practice/);
 assert.doesNotMatch(preview.text,/Gobi Desert|Danube River/);
}
console.log('PASS Nepal-only map practice in three languages, historical comparison preserved, official exam gate unchanged');
