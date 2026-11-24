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
 assert.equal(pack.questions.length,63);
 assert.equal(new Set(pack.questions.map(q=>q.id)).size,63);
 assert.equal(pack.exactGridVerified,false);
 assert.ok(pack.units.every(u=>u.provenance.includes('review pending')&&u.sourceUrl.includes('Opt%20Env%20Sc%20Grade%209')));
 for(const unit of pack.units){
  assert.ok(unit.unitTitleEn&&unit.unitTitle);
  const questions=pack.questions.filter(q=>q.unitId===unit.id);
  assert.equal(questions.length,7);
  assert.deepEqual(questions.map(q=>q.marks),[2,2,4,4,1,5,8]);
  assert.deepEqual(questions.map(q=>q.cognitiveLevel),['knowledge','understanding','application','higher','knowledge','application','higher']);
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

const {grade9CompulsoryMathPracticeBank,auditCompulsoryMathArchive}=await import('../cdc-grade9-compulsory-math-practice.mjs');
for(const subject of ['Compulsory Mathematics','अनिवार्य गणित']){
 const args={grade:9,subject},p=grade9CompulsoryMathPracticeBank(args),a=auditCompulsoryMathArchive(args);
 assert.equal(p.units.length,7);assert.equal(p.questions.length,42);
 assert.equal(new Set(p.questions.map(q=>q.id)).size,42);
 assert.equal(a.groupCount,16);assert.equal(a.itemCount,49);
 assert.deepEqual(a.areas.map(x=>x.marks),[6,13,13,15,13,11,4]);
 assert.deepEqual(a.cognitiveMarks,[12,18,30,15]);
 assert.equal(a.currentCdcExactApproved,false);assert.equal(p.exactGridVerified,false);
 for(const unit of p.units){
  const qs=p.questions.filter(q=>q.unitId===unit.id);
  assert.equal(qs.length,6);assert.equal(unit.topics.length,3);
  for(const topicName of unit.topics)assert.equal(qs.filter(q=>q.topicName===topicName).length,2);
  assert.ok(qs.every(q=>q.questionText&&q.questionTextEn&&q.answer&&q.answerEn&&q.teacherReviewRequired&&!q.officialCdcQuestion));
 }
}
assert.equal(grade9CompulsoryMathPracticeBank({grade:9,subject:'Optional I: Additional Mathematics'}).questions.length,0);
assert.equal(grade9CompulsoryMathPracticeBank({grade:10,subject:'Mathematics'}).questions.length,0);
assert.equal(byKey.math.gridTranscribed,false);
const mathQuestions=grade9CompulsoryMathPracticeBank({grade:9,subject:'Mathematics'}).questions;
assert.equal(mathQuestions.find(q=>q.id==='smss_math_g9_u2_t2_v2').answerEn,'4000×10×2/100=800; total 4800');
assert.equal(mathQuestions.find(q=>q.id==='smss_math_g9_u7_t2_v2').answerEn,'√(6²+8²)=10; tan θ=3/4');
console.log('PASS Grade9 compulsory math archive arithmetic and original bilingual practice scope');

const {grade9EnglishPracticeBank,auditEnglishChart}=await import('../cdc-grade9-english-practice.mjs');
for(const subject of ['Compulsory English','अनिवार्य अङ्ग्रेजी']){
 const args={grade:9,subject},p=grade9EnglishPracticeBank(args),a=auditEnglishChart(args);
 assert.equal(p.units.length,18);assert.equal(p.questions.length,54);
 assert.equal(new Set(p.questions.map(q=>q.id)).size,54);
 assert.equal(new Set(p.questions.map(q=>q.questionText)).size,54);
 assert.equal(a.reading.reduce((n,x)=>n+x.marks,0),40);
 assert.equal(a.writing.reduce((n,x)=>n+x.marks,0)+a.grammar.reduce((n,x)=>n+x.count*x.marksEach,0),35);
 assert.equal(Object.values(a.comprehensionCounts).reduce((n,x)=>n+x,0),40);
 assert.equal(a.modelGrade,10);assert.equal(a.currentCdcExactApproved,false);
 assert.equal(p.exactGridVerified,false);
 for(const u of p.units){
  const qs=p.questions.filter(q=>q.unitId===u.id);
  assert.equal(qs.length,3);assert.deepEqual(qs.map(q=>q.marks),[1,1,5]);
  assert.ok(qs.every(q=>q.questionText===q.questionTextEn&&q.answer===q.answerEn&&q.teacherReviewRequired&&!q.officialCdcQuestion));
 }
}
assert.equal(grade9EnglishPracticeBank({grade:10,subject:'English'}).questions.length,0);
assert.equal(grade9EnglishPracticeBank({grade:9,subject:'Nepali'}).questions.length,0);
assert.equal(byKey.english.gridTranscribed,false);
assert.match(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),/cdc-grade9-english-practice\.mjs/);
console.log('PASS Grade9 English eighteen textbook units and chart arithmetic; no false exact paper');

const {grade9NepaliPracticeBank,NEPALI_BOOK_PAGE,NEPALI_CORRECTION_NOTICE}=await import('../cdc-grade9-nepali-practice.mjs');
for(const subject of ['Compulsory Nepali','अनिवार्य नेपाली']){
 const p=grade9NepaliPracticeBank({grade:9,subject});
 assert.equal(p.units.length,16);assert.equal(p.questions.length,48);
 assert.equal(new Set(p.questions.map(q=>q.id)).size,48);
 assert.equal(new Set(p.questions.map(q=>q.questionText)).size,48);
 assert.equal(p.exactGridVerified,false);
 for(const u of p.units){
  assert.equal(u.sourceUrl,NEPALI_BOOK_PAGE);
  assert.match(u.provenance,/review pending/);
  const qs=p.questions.filter(q=>q.unitId===u.id);
  assert.deepEqual(qs.map(q=>q.marks),[1,2,5]);
  assert.ok(qs.every(q=>q.questionText===q.questionTextEn&&q.answer===q.answerEn&&q.teacherReviewRequired&&!q.officialCdcQuestion));
 }
}
assert.equal(grade9NepaliPracticeBank({grade:10,subject:'Nepali'}).questions.length,0);
assert.equal(grade9NepaliPracticeBank({grade:9,subject:'English'}).questions.length,0);
assert.equal(byKey.nepali.gridTranscribed,false);
assert.ok(data.sources.some(s=>s.url===NEPALI_CORRECTION_NOTICE));
assert.match(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),/cdc-grade9-nepali-practice\.mjs/);
console.log('PASS Grade9 Nepali practice, language, source caveats and isolation');

const {grade9ScienceOriginalBank,SCIENCE_TEXTBOOK_URL}=await import('../cdc-grade9-science-original-practice.mjs');
for(const subject of ['Science and Technology','विज्ञान तथा प्रविधि']){
 const p=grade9ScienceOriginalBank({grade:9,subject});
 assert.equal(p.units.length,19);assert.equal(p.questions.length,76);
 assert.equal(new Set(p.questions.map(q=>q.id)).size,76);
 assert.equal(new Set(p.questions.map(q=>q.questionText)).size,76);
 assert.equal(p.exactGridVerified,false);
 assert.equal(p.units[2].unitTitleEn,'Mushroom');
 assert.equal(p.units[18].unitTitleEn,'Materials used in Agriculture');
 for(const u of p.units){
  assert.equal(u.sourceUrl,SCIENCE_TEXTBOOK_URL);
  const qs=p.questions.filter(q=>q.unitId===u.id);
  assert.deepEqual(qs.map(q=>q.questionType),['mcq','very_short','short','long']);
  assert.deepEqual(qs.map(q=>q.marks),[1,1,2,4]);
  assert.ok(qs.every(q=>q.questionText&&q.questionTextEn&&q.answer&&q.answerEn&&q.teacherReviewRequired&&!q.officialCdcQuestion&&u.topics.includes(q.topicName)));
  const mcq=qs[0],k='ABCD'.indexOf(mcq.correctOption);
  assert.ok(k>=0&&mcq.options.length===4&&mcq.optionsEn.length===4);
  assert.equal(mcq.answer,mcq.options[k]);assert.equal(mcq.answerEn,mcq.optionsEn[k]);
 }
}
for(const [grade,subject] of [[8,'Science'],[10,'Science'],[9,'Optional Computer Science'],[9,'Optional I: Environmental Science']])assert.equal(grade9ScienceOriginalBank({grade,subject}).questions.length,0);
assert.equal(byKey.science.gridTranscribed,false);
assert.ok(data.sources.some(s=>s.url===SCIENCE_TEXTBOOK_URL&&s.kind==='CDC_textbook'));
assert.match(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),/cdc-grade9-science-original-practice\.mjs/);
console.log('PASS Grade9 Science nineteen textbook units, 76 bilingual original items, answer keys and subject isolation');
