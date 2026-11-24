import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readBundledScienceBank,isQuestionReadyForLanguage,
 buildAutomaticQuestionPaper} from '../cdc-question-autogen.mjs';
import {grade8ScienceOriginalSupplement}
 from '../cdc-grade8-science-original-supplement.mjs';
import {getGrade8ScienceHistoricalPracticePattern,
 compareGrade8SciencePracticeBank} from '../cdc-grade8-science-model-audit.mjs';
const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const practice=json('../data/cdc-grade8-science-practice-pack-v1.json'),
 translations=json('../data/cdc-science-bilingual-mcq-v1.json');
for(const subject of ['Science and Technology','विज्ञान तथा प्रविधि']){
 const base=readBundledScienceBank(practice,{
  grade:8,subject,bilingual:translations.translations
 });
 assert.equal(base.units.length,11);
 assert.equal(base.questions.length,55);
 const supplement=grade8ScienceOriginalSupplement({subject,units:base.units});
 const rows=supplement.questions;
 assert.equal(rows.length,40);
 assert.equal(rows.filter(q=>q.questionType==='very_short').length,16);
 assert.equal(rows.filter(q=>q.questionType==='short').length,16);
 assert.equal(rows.filter(q=>q.questionType==='long').length,8);
 assert.ok(rows.every(q=>q.teacherReviewRequired===true&&
  q.officialCdcQuestion===false&&q.bundled===true));
 assert.ok(rows.every(q=>isQuestionReadyForLanguage(q,'ne')));
 assert.ok(rows.every(q=>isQuestionReadyForLanguage(q,'en')));
 assert.ok(rows.every(q=>isQuestionReadyForLanguage(q,'both')));
 assert.equal(new Set(rows.map(x=>x.id)).size,40);
 assert.equal(new Set(rows.map(x=>x.questionText)).size,40);
 assert.ok(rows.every(q=>base.units.some(u=>
  u.id===q.unitId&&u.id+'_0'===q.topicId&&u.unitCode===q.unitCode)));
 const all=[...base.questions,...rows];
 const audited=compareGrade8SciencePracticeBank({grade:8,subject,questions:all});
 assert.equal(audited.practiceQuestionCount,95);
 assert.equal(audited.missingTypes.length,0);
 assert.equal(audited.readyForExactGeneration,false,
  'Question bank expansion never validates the current CDC Grid');
 const historic=getGrade8ScienceHistoricalPracticePattern({grade:8,subject});
 assert.ok(historic.practiceOnly&&!historic.currentCdcExactApproved);
 const topicIds=base.units.map(u=>u.id+'_0');
 const first=buildAutomaticQuestionPaper({questions:all,topicIds,
  fullMarks:50,language:'both',blueprint:historic,
  requireExactGrid:false,gradeNumber:8,subject,rng:()=>0.13});
 assert.equal(first.questions.length,30);
 assert.equal(first.questions.reduce((s,q)=>s+q.marks,0),50);
 assert.deepEqual(['mcq','very_short','short','long'].map(type=>
  first.questions.filter(q=>q.questionType===type).length),[10,8,8,4]);
 assert.equal(first.exactGridMatched,false);
 assert.equal(first.teacherReviewRequired,true);
 assert.ok(first.questions.every(q=>q.questionText&&q.answer));
 const next=buildAutomaticQuestionPaper({questions:all,topicIds,
  fullMarks:50,language:'both',blueprint:historic,
  requireExactGrid:false,gradeNumber:8,subject,rng:()=>0.79,
  previousSignature:first.signature});
 assert.notEqual(first.signature,next.signature,
  'Random original practice paper should not repeat the preceding paper');
 assert.throws(()=>buildAutomaticQuestionPaper({questions:all,topicIds,
  fullMarks:50,language:'both',blueprint:historic,
  requireExactGrid:true,gradeNumber:8,subject,rng:()=>0.2}),/unit-wise Grid/,
  'Historic model cannot masquerade as an independently validated CDC Grid');
 console.log('PASS '+subject+': 95 practice items, 40 original bilingual 1/2/4 marks,');
 console.log('two different 30-item, 50-mark practice papers and correct teacher review gate');
}
assert.equal(grade8ScienceOriginalSupplement({subject:'Computer Science',units:[]}).questions.length,0);
assert.equal(grade8ScienceOriginalSupplement({subject:'Science and Technology',units:[]}).questions.length,0);
console.log('PASS no Grade8 Science historical paper is falsely marked as CDC 2083 Exact');
