import assert from 'node:assert/strict';
import {generateMathPractice,printMathPractice} from './optional-math-practice-preview.mjs';
import {getCdcOptionalMathGuide,optionalMathCellAudit} from './cdc-optional-math-2082.mjs';
const guide=getCdcOptionalMathGuide({grade:9,subject:'Optional Mathematics'});
for(const language of ['ne','en','both']){
 const args={schoolId:'12345',schoolName:'Test <School>',language,rng:()=>0.4};
 const paper=generateMathPractice(args);
 assert.equal(paper.questions.length,27);
 assert.equal(paper.fullMarks,75);
 assert.equal(paper.official,false);
 assert.equal(optionalMathCellAudit(guide,paper.questions).matches,true);
 const second=generateMathPractice({...args,avoidSignatures:[paper.signature],rng:()=>0.6});
 assert.notEqual(second.signature,paper.signature);
 const html=printMathPractice({paper});
 assert.match(html,/A4 landscape/);assert.match(html,/column-count:2/);
 assert.match(html,/NOT AN OFFICIAL CDC QUESTION PAPER/);
 assert.match(html,/Test &lt;School&gt;/);
 assert.match(printMathPractice({paper,showAnswers:true}),/Answer Key|उत्तरकुञ्जिका/);
 assert.throws(()=>printMathPractice({paper:{...paper}}),/Unchanged/);
 paper.questions[0].subquestions[0].marks=2;
 assert.throws(()=>printMathPractice({paper}),/Unchanged/);
}
console.log('PASS V47 Grade 9 Optional Mathematics original composite practice, 75 marks, 27 slots, 72 cells, languages and print');
