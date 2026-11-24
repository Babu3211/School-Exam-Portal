import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditGrade9Release,GRADE9_BASE_SUBJECTS,GRADE9_OPTIONAL_SUBJECTS}
 from '../cdc-grade9-release-audit.mjs';
const data=JSON.parse(readFileSync(new URL(
 '../data/cdc-question-paper-sources-2083.json',import.meta.url),'utf8'));
const baseline=auditGrade9Release({register:data});
assert.equal(baseline.grade,9);
assert.equal(baseline.academicYear,2083);
assert.equal(baseline.readyForLive,false);
assert.equal(GRADE9_BASE_SUBJECTS.length,5);
assert.equal(GRADE9_OPTIONAL_SUBJECTS.length,3);
assert.equal(baseline.checkedSubjects.length,8);
assert.equal(baseline.grade9PaperReady,false);
assert.ok(baseline.blockers.length>0);
const byKey=Object.fromEntries(baseline.checkedSubjects.map(x=>[x.key,x]));
assert.equal(Object.keys(byKey).length,8);
assert.equal(byKey.optional_computer.gridTranscribed,true);
assert.equal(byKey.optional_computer.gridType,'unit_wise_computer');
assert.equal(byKey.optional_computer.questionBankReviewed,false);
assert.equal(byKey.optional_math.gridTranscribed,true);
assert.equal(byKey.optional_math.gridType,'optional_math_WCA_CCA');
assert.equal(byKey.science.gridTranscribed,false);
assert.equal(byKey.english.gridTranscribed,false);
assert.equal(byKey.nepali.gridTranscribed,false);
assert.equal(byKey.math.gridTranscribed,false);
assert.equal(byKey.social.gridTranscribed,false);
assert.equal(byKey.optional_environment.gridTranscribed,false);
assert.equal(byKey.optional_environment.status,'source_missing');
assert.equal(byKey.optional_economics,undefined,'Economics is not offered in V46 default scope');
assert.equal(byKey.accounting,undefined,'Accounting is not offered in V46 default scope');
const mainHtml=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(mainHtml,/ऐच्छिक प्रथम: वातावरण विज्ञान/);
const v46Aliases=auditGrade9Release({register:data,offeredSubjects:['Optional I: Environmental Science','Optional II: Computer Science','Optional I: Additional Mathematics']});
assert.equal(v46Aliases.checkedSubjects.length,8);
assert.deepEqual(v46Aliases.unknownSchoolSubjects,[]);
assert.ok(baseline.checkedSubjects.filter(x=>x.officialSourceUrl).length>=7);
const ownSchool=auditGrade9Release({
 register:data,offeredSubjects:['Optional Computer Science','Optional Mathematics']
});
assert.equal(ownSchool.checkedSubjects.length,7);
assert.ok(ownSchool.checkedSubjects.some(x=>x.key==='optional_math'));
assert.ok(!ownSchool.checkedSubjects.some(x=>x.key==='optional_economics'));
assert.ok(ownSchool.checkedSubjects.every(x=>x.key==='optional_math'||
 x.key==='optional_computer'||GRADE9_BASE_SUBJECTS.some(s=>s.key===x.key)));
const noOptional=auditGrade9Release({register:data,offeredSubjects:[]});
assert.equal(noOptional.checkedSubjects.length,5,'Required subjects cannot be removed');
const extra=auditGrade9Release({
 register:data,offeredSubjects:['Optional Computer Science','Robotics']
});
assert.deepEqual(extra.unknownSchoolSubjects,['Robotics'],
 'School subjects not yet in CDC source index must remain blockers');
assert.equal(extra.grade9PaperReady,false);
const forged=auditGrade9Release({register:data,offeredSubjects:[],
 exactGridReviews:{nepali:true,english:true,math:true,science:true,social:true},
 reviewedBanks:{nepali:true,english:true,math:true,science:true,social:true},
 teacherTestedPapers:{nepali:true,english:true,math:true,science:true,social:true}
});
assert.equal(forged.grade9PaperReady,true,'Fully reviewed, approved subject subset passes prerequisite audit');
assert.equal(forged.readyForLive,false,'Grade9 subject prereq never grants live deployment itself');
assert.throws(()=>auditGrade9Release({}),/Official CDC source register required/);
console.log('PASS Grade9 source, unit-grid, question review and teacher-test release gate');
console.log('Mandatory subjects 5, V46 optional streams 3, live gate stays closed without release workflow');

const {grade9EnvironmentOriginalBank}=await import('../cdc-grade9-environment-original-practice.mjs');
for(const subject of ['Optional I: Environmental Science','Optional Environment Science','ऐच्छिक प्रथम: वातावरण विज्ञान']){
 const pack=grade9EnvironmentOriginalBank({grade:9,subject});
 assert.equal(pack.units.length,9);
 assert.equal(pack.questions.length,36);
 assert.equal(new Set(pack.questions.map(q=>q.id)).size,36);
 assert.equal(pack.exactGridVerified,false);
 assert.ok(pack.units.every(u=>u.provenance.includes('review pending')&&u.sourceUrl.includes('id=15803')));
 for(const unit of pack.units){
  assert.ok(unit.unitTitleEn&&unit.unitTitle);
  const questions=pack.questions.filter(q=>q.unitId===unit.id);
  assert.equal(questions.length,4);
  assert.deepEqual(questions.map(q=>q.cognitiveLevel),['knowledge','understanding','application','higher']);
  assert.ok(questions.every(q=>q.questionText&&q.questionTextEn&&q.answer&&q.answerEn&&q.teacherReviewRequired&&!q.officialCdcQuestion));
 }
}
for(const [grade,subject] of [[8,'Environmental Science'],[10,'Environmental Science'],[9,'Science and Technology'],[9,'Computer Science']]){
 assert.equal(grade9EnvironmentOriginalBank({grade,subject}).questions.length,0);
}
assert.ok(data.sources.some(s=>s.subject==='ऐच्छिक वातावरण विज्ञान'&&s.kind==='CDC_textbook'&&s.url.includes('id=15803')));
assert.equal(byKey.optional_environment.status,'source_missing','Textbook must never count as verified grid');
assert.match(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),/cdc-grade9-environment-original-practice\.mjs/);
console.log('PASS Grade9 environment nine-unit bilingual practice, source separation and offline cache');

const {grade9SocialOriginalBank}=await import('../cdc-grade9-social-original-practice.mjs');
for(const subject of ['Social Studies','सामाजिक अध्ययन']){
 const pack=grade9SocialOriginalBank({grade:9,subject});
 assert.equal(pack.units.length,10);
 assert.equal(pack.questions.length,30);
 assert.equal(new Set(pack.questions.map(q=>q.id)).size,30);
 assert.equal(pack.exactGridVerified,false);
 for(const unit of pack.units){
  assert.equal(unit.topics.length,3);
  const qs=pack.questions.filter(q=>q.unitId===unit.id);
  assert.deepEqual(qs.map(q=>q.marks),[1,4,7]);
  assert.deepEqual(qs.map(q=>q.topicName),unit.topics);
  assert.ok(qs.every(q=>q.questionText&&q.questionTextEn&&q.answer&&q.answerEn&&q.teacherReviewRequired&&!q.officialCdcQuestion));
 }
}
assert.equal(grade9SocialOriginalBank({grade:10,subject:'Social Studies'}).questions.length,0);
assert.equal(grade9SocialOriginalBank({grade:9,subject:'Science and Technology'}).questions.length,0);
assert.equal(byKey.social.gridTranscribed,false,'Current curriculum and historical grid must not approve exact generation');
assert.match(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),/cdc-grade9-social-original-practice\.mjs/);
console.log('PASS Grade9 Social current curriculum areas, original bilingual questions and no false exact approval');
