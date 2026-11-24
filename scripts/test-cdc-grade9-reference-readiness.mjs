import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectGrade9ReferenceReadiness as inspect} from '../cdc-grade9-reference-readiness.mjs';
import {grade9NepaliPracticeBank} from '../cdc-grade9-nepali-practice.mjs';
import {grade9EnglishPracticeBank} from '../cdc-grade9-english-practice.mjs';
import {grade9CompulsoryMathPracticeBank} from '../cdc-grade9-compulsory-math-practice.mjs';
import {grade9ScienceOriginalBank} from '../cdc-grade9-science-original-practice.mjs';
import {grade9SocialOriginalBank} from '../cdc-grade9-social-original-practice.mjs';
import {grade9EnvironmentOriginalBank} from '../cdc-grade9-environment-original-practice.mjs';
import {grade9ComputerOriginalBank} from '../cdc-grade9-computer-original-practice.mjs';
import {getBundledComputerGrid,bundledComputerUnitTopics} from '../cdc-verified-computer-grids.mjs';
import {buildAutomaticQuestionPaper} from '../cdc-question-autogen.mjs';
import {getCdcOptionalMathGuide,optionalMathAreaTopics} from '../cdc-optional-math-2082.mjs';
import {originalOptionalMathPracticeBank} from '../cdc-optional-math-original-practice.mjs';
import {inspectCdcOptionalMathPaper} from '../cdc-optional-math-composite.mjs';
import {assertGrade9ExamPaperMatches} from '../cdc-grade9-paper-grid-guard.mjs';
const grade=9;
for(const [subject,provider,total] of [['Nepali',grade9NepaliPracticeBank,48],['English',grade9EnglishPracticeBank,54],['Mathematics',grade9CompulsoryMathPracticeBank,42],['Science and Technology',grade9ScienceOriginalBank,76],['Social Studies',grade9SocialOriginalBank,30],['Environmental Science',grade9EnvironmentOriginalBank,63]]){
 const pack=provider({grade,subject});
 const before=JSON.stringify(pack);
 const report=inspect({grade,subject,questions:pack.questions});
 assert.equal(report.bankCount,total,subject);
 assert.equal(report.referenceStructureMatched,false,subject);
 assert.equal(report.currentCdcExactApproved,false);
 assert.equal(report.reviewedCount,0);
 assert.ok(report.missing.length>0,subject);
 assert.equal(JSON.stringify(pack),before,'Read-only audit must not mutate question bank');
 assert.equal(inspect({grade,subject,questions:pack.questions,selectedTopicIds:['invalid']}).selectedBankCount,0);
 console.log(subject+': '+total+' original tasks, '+report.missing.length+' missing reference positions/categories, official generation blocked');
}
assert.equal(inspect({grade:8,subject:'English'}),null);
assert.equal(inspect({grade,subject:'Economics'}),null);
// Use real shipped original banks, never synthetic question content.
const subject='Optional Computer Science',bp=getBundledComputerGrid({grade,subject,fullMarks:50});
const computer=grade9ComputerOriginalBank({subject}),topics=bundledComputerUnitTopics(grade,subject).map(u=>u.id+'_0');
for(const language of ['ne','en','both']){
 const args={questions:computer.questions,topicIds:topics,fullMarks:50,language,blueprint:bp,requireExactGrid:true,gradeNumber:grade,subject,rng:()=>.39};
 const a=buildAutomaticQuestionPaper(args),b=buildAutomaticQuestionPaper({...args,previousSignature:a.signature,rng:()=>.61});
 assert.notEqual(a.signature,b.signature);
 for(const r of [a,b]){
  const p={gradeNumber:grade,subject,fullMarks:50,durationMinutes:bp.durationMinutes,language,topicIds:topics,questions:r.questions.map(q=>({...q,questionId:q.id,gridEvidence:r.gridAudit.slotEvidence.find(e=>e.questionId===q.id)}))};
  assert.equal(assertGrade9ExamPaperMatches(p),true);
 }
}
const math='Optional Mathematics',guide=getCdcOptionalMathGuide({grade,subject:math}),pack=originalOptionalMathPracticeBank({grade,subject:math}),mathTopics=optionalMathAreaTopics(grade,math).map(u=>u.id+'_0');
for(const language of ['ne','en','both']){
 const args={guide,questions:pack.questions,selectedTopicIds:mathTopics,language,allowFormulaVerifiedDraft:true,rng:()=>.4};
 const a=inspectCdcOptionalMathPaper(args),b=inspectCdcOptionalMathPaper({...args,previousSignature:a.signature,rng:()=>.6});
 assert.equal(a.ready,true,a.reason);assert.equal(b.ready,true,b.reason);assert.notEqual(a.signature,b.signature);
 for(const r of [a,b])assert.equal(assertGrade9ExamPaperMatches({gradeNumber:grade,subject:math,fullMarks:75,durationMinutes:180,language,questionFormat:'cdc_optional_math_composite',questions:r.questions.map(q=>({...q,questionId:q.id}))}),true);
}
const ui=readFileSync(new URL('../cdc-question-paper.js',import.meta.url),'utf8');
assert.match(ui,/inspectGrade9ReferenceReadiness\(\{grade,subject,questions:\[\.\.\.questionRows,\.\.\.bundledPracticeQuestions\]\}\)/);
console.log('PASS actual eight bundled subject banks, 12 distinct structural papers across two supported subjects and six explicit non-ready references');
