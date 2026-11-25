import assert from 'node:assert/strict';
import {aggregateExactCdcGrid,validateExactCdcUnitGrid,
 allocateExactCdcUnitGrid} from '../cdc-exact-grid.mjs';
import {buildAutomaticQuestionPaper,isQuestionReadyForLanguage}
 from '../cdc-question-autogen.mjs';
import {CDC_GRID_EXCEL_FIELDS,parseCdcGridExcelSheet}
 from '../cdc-question-excel.mjs';
// Synthetic regression ONLY. These four rows are not a claim that a
// Grade 8 Science 2083 CDC Grid was externally authenticated.
const rows=[
 {unitCode:'1',type:'mcq',marks:1,count:1,cognitiveLevel:'knowledge'},
 {unitCode:'2',type:'very_short',marks:1,count:1,cognitiveLevel:'understanding'},
 {unitCode:'3',type:'short',marks:2,count:1,cognitiveLevel:'application'},
 {unitCode:'4',type:'long',marks:4,count:1,cognitiveLevel:'higher'}
];
const aggregate=aggregateExactCdcGrid(rows);
assert.equal(aggregate.fullMarks,8);
assert.equal(aggregate.questionCount,4);
assert.deepEqual(aggregate.pattern.map(r=>r.type),
 ['mcq','very_short','short','long']);
assert.deepEqual(aggregate.distribution,{
 knowledge:12.5,understanding:12.5,application:25,higher:50});
const subject='Science and Technology';
const blueprint={gradeNumber:8,subject,fullMarks:8,
 unitGrid:rows,pattern:aggregate.pattern,
 cognitiveDistribution:aggregate.distribution,
 sourceUrl:'https://moecdc.gov.np/content/284/specification-grid--grade-8--science-and-technology/',
 curriculumVersion:'SYNTHETIC TEST — NOT A REAL CDC GRID',
 verifiedBy:'unit-test'};
const slots=validateExactCdcUnitGrid(blueprint,8,{gradeNumber:8,subject});
assert.equal(slots.slots.length,4);
const topics=rows.map(row=>'test-g8-unit-'+row.unitCode);
const bank=rows.flatMap((slot,i)=>[0,1].map(alt=>({
 id:'g8-'+i+'-'+alt,gradeNumber:8,subject,
 unitCode:slot.unitCode,topicId:topics[i],
 questionType:slot.type,marks:slot.marks,
 cognitiveLevel:slot.cognitiveLevel,
 status:'active',
 questionText:'कृत्रिम प्रश्न '+i+' विकल्प '+alt+' के हो?',
 questionTextEn:'What is synthetic item '+i+', alternative '+alt+'?',
 answer:'नमुना उत्तर '+i,answerEn:'Sample answer '+i,
 options:slot.type==='mcq'?['पहिलो','दोस्रो','तेस्रो','चौथो']:[],
 optionsEn:slot.type==='mcq'?['One','Two','Three','Four']:[],
 correctOption:slot.type==='mcq'?'A':''
})));
assert.ok(bank.every(x=>isQuestionReadyForLanguage(x,'both')));
const first=allocateExactCdcUnitGrid({
 blueprint,fullMarks:8,eligible:bank,selectedTopicIds:topics,
 gradeNumber:8,subject,rng:()=>0.21});
assert.deepEqual(first.questions.map(q=>q.questionType),
 ['mcq','very_short','short','long']);
assert.equal(first.questions.reduce((n,q)=>n+q.marks,0),8);
const second=allocateExactCdcUnitGrid({
 blueprint,fullMarks:8,eligible:bank,selectedTopicIds:topics,
 gradeNumber:8,subject,previousSignature:first.signature,rng:()=>0.7});
assert.notEqual(first.signature,second.signature);
const generated=buildAutomaticQuestionPaper({
 questions:bank,topicIds:topics,fullMarks:8,
 language:'both',blueprint,requireExactGrid:true,
 gradeNumber:8,subject,rng:()=>0.35});
assert.equal(generated.exactGridMatched,true);
assert.equal(generated.questions.length,4);
assert.deepEqual(generated.questions.map(q=>q.questionType),
 ['mcq','very_short','short','long']);
assert.equal(generated.questions.reduce((n,q)=>n+q.marks,0),8);
const h=CDC_GRID_EXCEL_FIELDS.map(x=>x[1]);
const data=rows.map(x=>[x.unitCode,x.type,String(x.marks),
 String(x.count),x.cognitiveLevel]);
const sheet=(entries)=>({rowCount:entries.length,
 getRow:n=>({getCell:i=>({text:entries[n-1]?.[i-1]??'',
  value:entries[n-1]?.[i-1]??''})})});
assert.deepEqual(parseCdcGridExcelSheet(sheet([h,...data])),rows);
assert.throws(()=>parseCdcGridExcelSheet(sheet([h,[
 '2','very_short','wrong','1','understanding']])),/Invalid CDC Grid/);
assert.throws(()=>validateExactCdcUnitGrid({
 ...blueprint,unitGrid:rows.map(x=>x.type==='very_short'?{...x,type:'short'}:x)
},8,{gradeNumber:8,subject}),/types\/marks differ/);
assert.equal(isQuestionReadyForLanguage({...bank[2],answerEn:''},'both'),false);
console.log('PASS synthetic 1/1/2/4 CDC Grid with VSQ: Excel, exact allocation, bilingual,');
console.log('     source/grade isolation, anti-repeat and four-category print ordering');
