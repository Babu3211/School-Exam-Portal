import assert from 'node:assert/strict';
import {computerGridReference,generateComputerPractice,assertComputerPracticeGrid} from './computer-grid-practice.mjs';
import {printReadOnlyPracticePaper} from './question-paper-cdc-preview.mjs';
import {cognitiveMarkDistribution} from './cdc-question-autogen.mjs';
for(const [grade,marks] of [[9,[11,4,5,8,5,5,12]],[10,[11,8,8,12,11]]]){
 const grid=computerGridReference(grade);
 assert.deepEqual(grid.units.map(u=>u.marks),marks);
 assert.equal(grid.units.reduce((n,u)=>n+u.counts.reduce((a,b)=>a+b,0),0),25);
 assert.deepEqual(Object.values(grid.distribution),[20,30,30,20]);
}
assert.throws(()=>computerGridReference(8));
for(const language of ['ne','en','both']){
 const args={schoolId:'12345',schoolName:'Synthetic <School>',language,rng:()=>0.39};
 const first=generateComputerPractice(args),second=generateComputerPractice({...args,avoidSignatures:[first.signature],rng:()=>0.61});
 assert.notEqual(first.signature,second.signature);assert.equal(first.questions.length,25);
 assert.deepEqual(Object.values(cognitiveMarkDistribution(first.questions,50)),[20,30,30,20]);
 assert.equal(assertComputerPracticeGrid(first),true);
 assert.throws(()=>assertComputerPracticeGrid({...first,totalMarks:49}),/scope/);
 const altered=first.questions.map((q,i)=>i===0?{...q,unitCode:'99'}:q);
 assert.throws(()=>assertComputerPracticeGrid({...first,questions:altered}),/slot/);
 const html=printReadOnlyPracticePaper({paper:first,showAnswers:true});
 assert.match(html,/A4 landscape/);assert.match(html,/columns:2/);assert.match(html,/NOT AN OFFICIAL CDC QUESTION PAPER/);
 assert.match(html,/Synthetic &lt;School&gt;/);
 if(language==='ne'){assert.match(html,/कक्षा ९/);assert.match(html,/पूर्णाङ्क: ५०/);assert.match(html,/१ अङ्क/);}
 else assert.match(html,/Total marks: 50/);
 assert.equal((html.match(/Teacher-review answer:/g)||[]).length,25);
 assert.doesNotMatch(printReadOnlyPracticePaper({paper:first}),/Teacher-review answer:/);
}
console.log('PASS V47 Grade 9 Computer original grid-matched practice, 25 slots, 50 marks, 3 languages, repeat prevention, Grade 10 reference');
