import assert from 'node:assert/strict';
import {validateDetailedCdcGrid,selectRandomGridQuestions} from '../cdc-question-grid-engine.mjs';
const base={gradeNumber:8,subject:'Science and Technology',fullMarks:10,
 sourceUrl:'https://moecdc.gov.np/content/284/specification-grid--grade-8--science-and-technology/',
 sourceTitle:'CDC Science and Technology Grade 8 Specification Grid',
 curriculumVersion:'Test source 2080',verifiedBy:'admin',verifiedAt:'synthetic',
 pattern:[{type:'mcq',count:2,marksEach:1},{type:'short',count:2,marksEach:4}],
 slots:[
  {type:'mcq',marks:1,unitTitle:'Motion',cognitiveLevel:'knowledge'},
  {type:'mcq',marks:1,unitTitle:'Matter',cognitiveLevel:'knowledge'},
  {type:'short',marks:4,unitTitle:'Motion',cognitiveLevel:'application'},
  {type:'short',marks:4,unitTitle:'Matter',cognitiveLevel:'application'}
 ]};
const grid=validateDetailedCdcGrid(base,{gradeNumber:8,subject:base.subject,fullMarks:10});
assert.equal(grid.slots.length,4);
let state=0;
const rng=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
const questions=[];
for(const [unit,topic] of [['Motion','motion'],['Matter','matter']]){
 for(const [type,marks,level] of [['mcq',1,'knowledge'],['short',4,'application']]){
  for(let n=0;n<5;n++)questions.push({id:unit+'-'+type+'-'+n,
   unitTitle:unit,topicId:topic,questionType:type,marks,
   cognitiveLevel:level,questionText:unit+' '+type+' question '+n,status:'active'});
 }
}
const first=selectRandomGridQuestions({questions,topicIds:['motion','matter'],grid,rng});
assert.equal(first.length,4);
assert.equal(first.reduce((n,q)=>n+q.marks,0),10);
assert.equal(new Set(first.map(q=>q.id)).size,4);
for(const [i,q]of first.entries()){
 const slot=grid.slots[i];
 assert.equal(q.unitTitle,slot.unitTitle);
 assert.equal(q.questionType,slot.type);
 assert.equal(q.cognitiveLevel,slot.cognitiveLevel);
}
const second=selectRandomGridQuestions({questions,topicIds:['motion','matter'],grid,
 previousQuestionIds:first.map(q=>q.id),rng});
assert.ok(second.some(q=>!first.some(old=>old.id===q.id)),'Next paper must contain different questions');
for(let n=0;n<24;n++){
 const variant=selectRandomGridQuestions({questions,topicIds:['motion','matter'],grid,rng});
 assert.equal(variant.reduce((sum,q)=>sum+q.marks,0),10);
 assert.equal(new Set(variant.map(q=>q.id)).size,4);
}
assert.throws(()=>validateDetailedCdcGrid({...base,fullMarks:11},
 {gradeNumber:8,subject:base.subject,fullMarks:10}),/Selected full marks/);
assert.throws(()=>validateDetailedCdcGrid({...base,slots:[...base.slots.slice(0,3),{...base.slots[3],marks:5}]},
 {gradeNumber:8,subject:base.subject,fullMarks:10}),/slots do not total/);
assert.throws(()=>validateDetailedCdcGrid({...base,slots:undefined},
 {gradeNumber:8,subject:base.subject,fullMarks:10}),/slots are missing/);
assert.throws(()=>validateDetailedCdcGrid({...base,subject:'Computer'},
 {gradeNumber:8,subject:base.subject,fullMarks:10}),/different class or subject/);
assert.throws(()=>validateDetailedCdcGrid({...base,sourceUrl:'https://example.com/fake-grid'},
 {gradeNumber:8,subject:base.subject,fullMarks:10}),/Official source citation/);
assert.throws(()=>selectRandomGridQuestions({questions,topicIds:['motion','matter','earth','light','plants'],grid,rng}),/Selected topics exceed/);
assert.throws(()=>selectRandomGridQuestions({questions:questions.filter(q=>q.unitTitle==='Motion'),
 topicIds:['motion','matter'],grid,rng}),/Not enough distinct|no eligible/);
assert.throws(()=>selectRandomGridQuestions({questions:questions.slice(0,2),topicIds:['motion','matter'],grid,rng}),/Not enough distinct/);
assert.throws(()=>selectRandomGridQuestions({questions:questions.filter(q=>q.id.endsWith('-0')),
 topicIds:['motion','matter'],grid,previousQuestionIds:first.map(x=>x.id),rng}),/No different/);
console.log('PASS detailed CDC grid engine: exact slots, units, cognitive levels, marks, topic coverage, different random set, strict fail-closed');
