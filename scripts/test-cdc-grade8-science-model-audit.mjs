import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GRADE8_SCIENCE_MODEL_2078,checkGrade8Science2078Model,
 compareGrade8SciencePracticeBank} from '../cdc-grade8-science-model-audit.mjs';
const src=GRADE8_SCIENCE_MODEL_2078;
assert.equal(src.version,'2078');
assert.equal(src.fullCurrentCdcAttachmentVisuallyInspected,false);
assert.equal(src.currentVersionApproved,false);
assert.equal(src.modelFullMarks,50);
assert.equal(src.durationMinutes,120);
assert.deepEqual(src.groups.map(x=>[x.code,x.count,x.marksEach,x.groupMarks]),[
 ['mcq',10,1,10],['very_short',8,1,8],['short',8,2,16],['long',4,4,16]]);
assert.deepEqual(src.unitMarks,[3,6,4,3,5,5,7,3,6,5,3]);
assert.deepEqual(src.unitGroupTotalMarks,[9,12,18,11]);
const alias=['Science','Science and Technology','विज्ञान तथा प्रविधि','अनिवार्य विज्ञान','General Science'];
for(const subject of alias){
 const a=checkGrade8Science2078Model({grade:8,subject});
 assert.equal(a.modelArithmeticInternallyConsistent,true);
 assert.equal(a.modelArithmeticChecks.fullMarks,50);
 assert.equal(a.modelArithmeticChecks.questionCount,30);
 assert.deepEqual(a.modelArithmeticChecks.sectionMarks,[10,8,16,16]);
 assert.deepEqual(a.modelArithmeticChecks.groupMarks,[9,12,18,11]);
 assert.deepEqual(a.modelArithmeticChecks.cognitiveMarks,[10,15,15,10]);
 assert.equal(a.modelArithmeticChecks.teachingHours,160);
 assert.equal(a.officialGridValidatedFor2083,false);
 assert.equal(a.readyForExactGeneration,false);
 assert.deepEqual(a.conflicts,['government_archive_grid_40_vs_model_50']);
 assert.equal(a.requiresPrimaryPdfReview,true);
}
for(const grade of [6,7,9,10])assert.equal(
 checkGrade8Science2078Model({grade,subject:'Science and Technology'}),null);
for(const s of ['Computer Science','Optional Mathematics','Social Studies','']){
 assert.equal(checkGrade8Science2078Model({grade:8,subject:s}),null);
}
const raw=JSON.parse(readFileSync(new URL(
 '../data/cdc-grade8-science-practice-pack-v1.json',import.meta.url),'utf8'));
const audited=compareGrade8SciencePracticeBank({
 grade:8,subject:'विज्ञान तथा प्रविधि',questions:raw.questions});
assert.equal(audited.practiceQuestionCount,55);
assert.equal(audited.compatibleBankCounts.mcq,22);
assert.equal(audited.compatibleBankCounts.very_short,0);
assert.equal(audited.compatibleBankCounts.short,0);
assert.equal(audited.compatibleBankCounts.long,0);
assert.deepEqual(audited.missingTypes.map(x=>[x.group,x.missingAtLeast]),
 [['very_short',8],['short',8],['long',4]]);
assert.ok(audited.missingCognition.some(x=>
 x.group==='mcq'&&x.level==='understanding'&&x.missingAtLeast===3));
assert.equal(audited.readyForExactGeneration,false,
 'A 55-question practice pack must never be called approved CDC Grade 8 exam');
assert.equal(compareGrade8SciencePracticeBank({
 grade:9,subject:'Science and Technology',questions:raw.questions}),null);
assert.throws(()=>compareGrade8SciencePracticeBank({
 grade:8,subject:'Science',questions:{}}),/question list required/);
console.log('PASS Grade8 Science historic CDC model: 50 marks, 30 items, four sections, 11 units;');
console.log('     government archive extracted grid 40 vs model 50 discrepancy explicitly flagged;');
console.log('     55 practice questions are structurally insufficient, missing VSQ, 2-mark & 4-mark;');
console.log('     old source is NOT automatically approved as current Grade8 CDC Exact blueprint.');
