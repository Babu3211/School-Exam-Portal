import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getCdcOptionalMathGuide} from '../cdc-optional-math-2082.mjs';
import {CDC_G10_OPTIONAL_MATH_2083_MODEL,compareCdc2083MathModelToBundledGrid}
 from '../cdc-optional-math-model-compare.mjs';
import {renderCdcCompositePaper} from '../cdc-optional-math-render.mjs';
import {originalOptionalMathPracticeBank} from '../cdc-optional-math-original-practice.mjs';
import {inspectCdcOptionalMathPaper} from '../cdc-optional-math-composite.mjs';
import {optionalMathAreaTopics} from '../cdc-optional-math-2082.mjs';
const audit=compareCdc2083MathModelToBundledGrid();
assert.deepEqual(audit.mismatches,[]);
assert.equal(audit.matches,true,'CDC 2082 table must match the 2083 model copy totals');
assert.equal(audit.gridRowsMatchModelCopy,true);
assert.equal(audit.comparisonCopyIsGovernmentAttachment,false,
 'Secondary mirror is not an authenticated government-file attachment');
assert.equal(CDC_G10_OPTIONAL_MATH_2083_MODEL.publicationYearBS,2083);
assert.equal(audit.questionItems,27);
assert.equal(audit.numberedMainQuestions,17);
assert.equal(CDC_G10_OPTIONAL_MATH_2083_MODEL.modelNumbering.objectiveParts.length,11);
assert.deepEqual(CDC_G10_OPTIONAL_MATH_2083_MODEL.contentAreaMarks,
 [17,17,20,7,7,7]);
const grade=10,subject='Optional Mathematics';
const guide=getCdcOptionalMathGuide({grade,subject});
const bank=originalOptionalMathPracticeBank({grade,subject});
const plan=inspectCdcOptionalMathPaper({
 guide,questions:bank.questions,language:'both',allowFormulaVerifiedDraft:true,
 selectedTopicIds:optionalMathAreaTopics(grade,subject).map(x=>x.id+'_0'),
 rng:()=>0.4
});
assert.equal(plan.ready,true,plan.reason);
const paper={
 questionFormat:'cdc_optional_math_composite',language:'both',
 schoolName:'SMSS Test School',className:'Class 10',subject,
 schoolAddress:'Nepal',paperTitle:'Synthetic Exam',academicYear:'2083',
 durationMinutes:180,fullMarks:75,questions:plan.questions
};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
for(const answerKey of [false,true]){
 const html=renderCdcCompositePaper(paper,{escapeHtml:esc,answerKey});
 assert.match(html,/1\. (?:Teacher Answer Key — )?Objective Questions \[11\]/);
 for(const letter of 'ABCDEFGHIJK')
  assert.match(html,new RegExp('<b>'+letter+'\\.</b>'),
   'One CDC Q1 part is missing: '+letter);
 for(let n=2;n<=17;n++)
  assert.match(html,new RegExp('<b>'+n+'\\. '),
   'Main Question #'+n+' is missing from grouped print');
 assert.doesNotMatch(html,/<b>18\./,
  'There must be 17 numbered main questions, not 27');
 assert.match(html,/Within Content Area/);
 assert.match(html,/Cross Content Area/);
 assert.match(html,/FM: 75/);
 assert.match(html,/SMSS original calculated practice/);
 assert.doesNotMatch(html,/<script[\s>]/);
 if(answerKey){
  assert.match(html,/Teacher Answer Key/);
  assert.match(html,/Correct option:/);
 }else{
  assert.match(html,/id="qpPrintArea"/);
  assert.match(html,/<div>a\. /);
 }
}
console.log('PASS CDC Grade 10 2083 mirrored model vs official 2082 table:');
console.log('  75 full marks, 3h, 11 Objective, WCA 12 / 40, CCA 4 / 24,');
console.log('  6 exact content area mark totals, 20/30/30/20 cognition,');
console.log('  17 main model question numbers Q1(A-K), Q2-13, Q14-17.');
console.log('CDC original 2083 PDF attachment remains unverified: secondary mirror only.');
