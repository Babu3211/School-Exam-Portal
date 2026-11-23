import assert from 'node:assert/strict';
import {validateExactCdcUnitGrid,allocateExactCdcUnitGrid} from '../cdc-exact-grid.mjs';
import {buildAutomaticQuestionPaper} from '../cdc-question-autogen.mjs';
let state=731;
const rng=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
const source='https://moecdc.gov.np/content/284/specification-grid--grade-8--science-and-technology/';
const unitGrid=[
 {unitCode:'1',type:'mcq',marks:1,count:1,cognitiveLevel:'knowledge'},
 {unitCode:'1',type:'short',marks:2,count:1,cognitiveLevel:'understanding'},
 {unitCode:'2',type:'mcq',marks:1,count:1,cognitiveLevel:'knowledge'},
 {unitCode:'2',type:'short',marks:2,count:1,cognitiveLevel:'application'}
];
const bp={fullMarks:6,unitGrid,sourceUrl:source,
 curriculumVersion:'SYNTHETIC TEST GRID (NOT ACTUAL CDC DISTRIBUTION)',
 verifiedBy:'school_admin_mock',
 pattern:[{type:'mcq',count:2,marks:1},{type:'short',count:2,marks:2}]};
const b=validateExactCdcUnitGrid(bp,6);
assert.equal(b.slots.length,4);
assert.deepEqual(b.requiredPerUnit,{'1':2,'2':2});
const questions=[];
for(const grade of [6,7,8,9,10]){
 // Same paper engine supports every target class; actual approved grids
 // must still be supplied for each grade/subject independently.
 const generated=[];
 for(const [i,g]of unitGrid.entries()){
  for(let k=0;k<5;k++){
   const q={id:'g'+grade+'_slot'+i+'_v'+k,
    gradeNumber:grade,unitCode:g.unitCode,
    topicId:'topic_'+g.unitCode,topicName:'Unit '+g.unitCode,
    questionType:g.type,marks:g.marks,cognitiveLevel:g.cognitiveLevel,
    questionText:'प्रश्न '+grade+' / '+i+' / '+k+'?',
    answer:'उत्तर '+i+' / '+k,options:g.type==='mcq'?['पहिलो','दोस्रो','तेस्रो','चौथो']:[],
    correctOption:g.type==='mcq'?'B':'',status:'active'};
   generated.push(q);
  }
 }
 const expected=[['1','mcq',1,'knowledge'],['1','short',2,'understanding'],
  ['2','mcq',1,'knowledge'],['2','short',2,'application']];
 const seen=new Set();
 let prior='';
 for(let attempt=0;attempt<25;attempt++){
  const paper=buildAutomaticQuestionPaper({questions:generated,
   topicIds:['topic_1','topic_2'],fullMarks:6,language:'ne',
   blueprint:bp,requireExactGrid:true,previousSignature:prior,rng});
  assert.equal(paper.exactGridMatched,true);
  assert.equal(paper.fullMarks,6);
  assert.equal(paper.gridAudit.slotEvidence.length,4);
  assert.equal(paper.questions.length,4);
  assert.equal(new Set(paper.questions.map(x=>x.id)).size,4);
  assert.equal(paper.questions.reduce((n,q)=>n+q.marks,0),6);
  for(const row of paper.gridAudit.slotEvidence){
   assert.ok(expected.some(v=>v[0]===row.unitCode&&v[1]===row.questionType&&v[2]===row.marks&&v[3]===row.cognitiveLevel));
  }
  for(const q of paper.questions.filter(x=>x.questionType==='mcq')){
   const o=generated.find(x=>x.id===q.id);
   assert.equal(q.options[q.correctOption.charCodeAt(0)-65],o.options[1],
    'Correct answer must follow MCQ option shuffle');
  }
  assert.notEqual(paper.signature,prior,'Consecutive selected question IDs cannot repeat');
  prior=paper.signature;seen.add(prior);
 }
 assert.ok(seen.size>=2,'Must yield different paper sets when alternatives exist');
 questions.push(...generated);
}
const first=buildAutomaticQuestionPaper({questions:questions.filter(x=>x.gradeNumber===8),
 topicIds:['topic_1','topic_2'],fullMarks:6,language:'ne',
 blueprint:bp,requireExactGrid:true,rng});
assert.throws(()=>buildAutomaticQuestionPaper({questions:questions.filter(x=>x.gradeNumber===8),
 topicIds:['topic_1','topic_2'],fullMarks:5,language:'ne',
 blueprint:bp,requireExactGrid:true,rng}),/full marks|Grid/);
assert.throws(()=>buildAutomaticQuestionPaper({questions:questions.filter(x=>x.gradeNumber===8),
 topicIds:['topic_1','topic_2'],fullMarks:6,language:'ne',
 blueprint:null,requireExactGrid:true,rng}),/grid/i);
assert.throws(()=>buildAutomaticQuestionPaper({questions:questions.filter(x=>x.gradeNumber===8),
 topicIds:['topic_1'],fullMarks:6,language:'ne',
 blueprint:bp,requireExactGrid:true,rng}),/Unit 2|topic|reviewed|Grid/);
assert.throws(()=>validateExactCdcUnitGrid({...bp,unitGrid:[...unitGrid.slice(0,3),{...unitGrid[3],marks:3}]},6),/total|differ/);
assert.throws(()=>validateExactCdcUnitGrid({...bp,pattern:[{type:'mcq',count:2,marks:1}]},6),/differ/);
assert.throws(()=>validateExactCdcUnitGrid({...bp,sourceUrl:'https://not-cdc.example/grid'},6),/CDC source/);
const single=unitGrid.map((g,i)=>({
 id:'only_'+i,unitCode:g.unitCode,topicId:'topic_'+g.unitCode,
 questionType:g.type,marks:g.marks,cognitiveLevel:g.cognitiveLevel,
 questionText:'एकमात्र प्रश्न '+i,answer:'उत्तर '+i,
 options:g.type==='mcq'?['एक','दुई','तीन','चार']:[],
 correctOption:g.type==='mcq'?'A':'',status:'active'
}));
const only=buildAutomaticQuestionPaper({questions:single,topicIds:['topic_1','topic_2'],
 fullMarks:6,language:'ne',blueprint:bp,requireExactGrid:true,rng});
assert.throws(()=>buildAutomaticQuestionPaper({questions:single,topicIds:['topic_1','topic_2'],
 fullMarks:6,language:'ne',blueprint:bp,requireExactGrid:true,
 previousSignature:only.signature,rng}),/different paper|alternatives/);
console.log('PASS V46 CDC exact unit/level/type/marks: 6-10 synthetic fixtures, 125 random papers, no consecutive repeats, no unsafe fallback');
