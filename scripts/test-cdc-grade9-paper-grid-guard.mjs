import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertGrade9ExamPaperMatches,grade9VerifiedExamStructure} from '../cdc-grade9-paper-grid-guard.mjs';
import {grade9ComputerOriginalBank} from '../cdc-grade9-computer-original-practice.mjs';
import {buildAutomaticQuestionPaper} from '../cdc-question-autogen.mjs';
import {getBundledComputerGrid} from '../cdc-verified-computer-grids.mjs';
import {getCdcOptionalMathGuide,optionalMathAreaTopics} from '../cdc-optional-math-2082.mjs';
import {originalOptionalMathPracticeBank} from '../cdc-optional-math-original-practice.mjs';
import {inspectCdcOptionalMathPaper} from '../cdc-optional-math-composite.mjs';
for(const subject of ['Nepali','English','Mathematics','Science and Technology','Social Studies','Environmental Science']){
 assert.equal(grade9VerifiedExamStructure({grade:9,subject,fullMarks:75}),null);
 assert.throws(()=>assertGrade9ExamPaperMatches({gradeNumber:9,subject,fullMarks:75,qualityReport:{exactGridMatched:true}}),/verified subject/);
}
const subject='Optional II: Computer Science',grade=9,fullMarks=50;
const bp=getBundledComputerGrid({grade,subject,fullMarks}),bank=grade9ComputerOriginalBank({subject});
const topicIds=bank.units.map(u=>u.id+'_0');
for(const language of ['ne','en','both']){
 const result=buildAutomaticQuestionPaper({questions:bank.questions,topicIds,fullMarks,language,blueprint:bp,requireExactGrid:true,gradeNumber:grade,subject,rng:()=>0.4});
 const p={gradeNumber:grade,subject,fullMarks,durationMinutes:120,topicIds,language,questions:result.questions.map(q=>({...q,questionId:q.id,gridEvidence:result.gridAudit.slotEvidence.find(e=>e.questionId===q.id)}))};
 assert.equal(assertGrade9ExamPaperMatches(p),true);
 if(language==='en'){const bad=structuredClone(p);bad.questions[0].answer='उत्तर';assert.throws(()=>assertGrade9ExamPaperMatches(bad),/untranslated/);}
 for(const change of [x=>x.fullMarks=49,x=>x.durationMinutes=180,x=>x.questions.pop(),x=>x.questions[0].gridEvidence.unitCode='99',x=>x.questions[0].marks=99,x=>x.questions[0].gridEvidence=null,x=>x.questions[1].questionId=x.questions[0].questionId,x=>x.topicIds=[],x=>x.language='invalid',x=>{const q=x.questions.find(q=>q.questionType==='mcq');q.options[1]=q.options[0];},x=>{const q=x.questions.find(q=>q.questionType==='mcq');q.correctOption=' A ';}]){
  const bad=structuredClone(p);change(bad);assert.throws(()=>assertGrade9ExamPaperMatches(bad),/CDC Grid mismatch/);
 }
}
const math='Optional Mathematics',guide=getCdcOptionalMathGuide({grade,subject:math});
const mathBank=originalOptionalMathPracticeBank({grade,subject:math});
const mathTopics=optionalMathAreaTopics(grade,math).map(u=>u.id+'_0');
const result=inspectCdcOptionalMathPaper({guide,questions:mathBank.questions,selectedTopicIds:mathTopics,language:'both',allowFormulaVerifiedDraft:true,rng:()=>0.4});
assert.equal(result.ready,true);
const p={gradeNumber:9,subject:math,fullMarks:75,durationMinutes:180,language:'both',questionFormat:'cdc_optional_math_composite',questions:result.questions.map(q=>({...q,questionId:q.id}))};
assert.equal(assertGrade9ExamPaperMatches(p),true);
const cellSwap=structuredClone(p);
const aa=cellSwap.questions.find(q=>q.group==='objective'&&q.subquestions[0].unitCode==='1'&&q.subquestions[0].cognitiveLevel==='knowledge').subquestions[0];
const zz=cellSwap.questions.find(q=>q.group==='objective'&&q.subquestions[0].unitCode==='4').subquestions[0];
[aa.cognitiveLevel,zz.cognitiveLevel]=[zz.cognitiveLevel,aa.cognitiveLevel];
assert.throws(()=>assertGrade9ExamPaperMatches(cellSwap),/cell allocation/);
for(const change of [x=>x.questions.pop(),x=>x.questions[0].subquestions[0].marks=2,x=>x.questions[0].subquestions[0].unitCode='99',x=>x.questions.find(q=>q.group==='CCA').subquestions.forEach(s=>s.unitCode='1'),x=>x.questions[0].subquestions[0].answerEn='',x=>x.questionFormat='flat',x=>{x.questions[0].subquestions[0].marks='1';},x=>{const q=x.questions.find(q=>q.group==='WCA');q.subquestions.forEach(s=>s.marks=10);}]){
 const bad=structuredClone(p);change(bad);assert.throws(()=>assertGrade9ExamPaperMatches(bad),/CDC Grid mismatch/);
}
assert.equal(assertGrade9ExamPaperMatches({gradeNumber:10}),true);
const ui=readFileSync(new URL('../cdc-question-paper.js',import.meta.url),'utf8');
assert.match(ui,/if\(grade===9\)return null;/);
assert.match(ui,/gradeNumber\(selectedClass\)===9&&mode!=="cdc"/);
assert.match(ui,/assertGrade9ExamPaperMatches\(generatedPaper\)/);
assert.match(ui,/assertGrade9ExamPaperMatches\(paper\)/);
assert.match(ui,/gradeNumber\(selectedClass\)===9\)throw Error/);
console.log('PASS real Grade 9 Computer and Optional Math papers; tampered marks, topics, units, groups, wrong duration and unverified six subjects rejected');
