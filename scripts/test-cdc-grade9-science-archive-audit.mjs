import assert from 'node:assert/strict';
import {ARCHIVED_G9_SCIENCE_2078,auditGrade9ScienceArchive}
 from '../cdc-grade9-science-archive-audit.mjs';
const g=ARCHIVED_G9_SCIENCE_2078;
assert.equal(g.sourceYearBS,2078);
assert.equal(g.fullMarks,75);
assert.equal(g.totalQuestionCount,40);
assert.equal(g.durationMinutes,180);
assert.equal(g.oldPdfScreenshotInspected,false);
assert.equal(g.current2083Approved,false);
assert.deepEqual(g.groupMarks,[10,19,26,20]);
assert.deepEqual(g.cognitiveMarks,[12,22,22,19]);
assert.equal(g.unitNames.length,19);
assert.equal(g.unitMarks.length,19);
assert.equal(g.unitMarks.reduce((sum,x)=>sum+x,0),75);
assert.deepEqual(g.groups.map(x=>[x.code,x.count,x.marksEach]),[
 ['mcq',10,1],['very_short',9,1],['short',14,2],['long',7,4]]);
for(const subject of ['Science and Technology','विज्ञान तथा प्रविधि','Science']){
 const audit=auditGrade9ScienceArchive({grade:9,subject});
 assert.ok(audit);
 assert.deepEqual(audit.oldModelMarks,[10,9,28,28]);
 assert.deepEqual(audit.oldCognitiveMarks,[12,22,22,19]);
 assert.deepEqual(audit.oldGroupedMarks,[10,19,26,20]);
 assert.equal(audit.publicationFound,true);
 assert.equal(audit.full2082GridInspected,false);
 assert.equal(audit.currentCdcExactApproved,false);
 assert.equal(audit.currentQuestionBankVerified,false);
 assert.equal(audit.readyForLive,false);
}
for(const subject of ['Optional Computer Science','Compulsory Mathematics','Social Studies'])
 assert.equal(auditGrade9ScienceArchive({grade:9,subject}),null);
for(const grade of [6,8,10])
 assert.equal(auditGrade9ScienceArchive({grade,subject:'Science and Technology'}),null);
console.log('PASS CDC old Grade9 Science source: 40 questions / 75 marks / 19 units;');
console.log('     old 2078 data is NOT released as updated 2082 / school-year-2083 CDC Grid');
