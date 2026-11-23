import assert from 'node:assert/strict';
import {QUESTION_EXCEL_FIELDS,parseQuestionExcelSheet} from '../cdc-question-excel.mjs';
const cell=value=>({text:String(value??''),value});
const sheet=rows=>({
 rowCount:rows.length,
 getRow:n=>({getCell:i=>cell(rows[n-1]?.[i-1])})
});
const headers=QUESTION_EXCEL_FIELDS.map(x=>x[1]);
const entry={
 unitCode:'1',unitTitle:'Matter',topicName:'States of Matter',
 questionType:'MCQ',marks:'1',cognitiveLevel:'KNOWLEDGE',
 questionText:'पदार्थको अवस्था कति छन्?',questionTextEn:'How many states of matter?',
 optionA:'दुई',optionB:'तीन',optionC:'चार',optionD:'पाँच',
 optionAEn:'Two',optionBEn:'Three',optionCEn:'Four',optionDEn:'Five',
 correctOption:'B',answer:'तीन',answerEn:'Three',
 sourceTitle:'CDC textbook',sourceUrl:'https://moecdc.gov.np/'
};
const row=QUESTION_EXCEL_FIELDS.map(([key])=>entry[key]||'');
const questions=parseQuestionExcelSheet(sheet([headers,row,[]]));
assert.equal(questions.length,1);
assert.equal(questions[0].unitCode,'1');
assert.equal(questions[0].questionType,'mcq');
assert.equal(questions[0].cognitiveLevel,'knowledge');
assert.deepEqual(questions[0].options,['दुई','तीन','चार','पाँच']);
assert.deepEqual(questions[0].optionsEn,['Two','Three','Four','Five']);
assert.equal(questions[0].answerEn,'Three');
assert.equal(questions[0].sourceUrl,'https://moecdc.gov.np/');
assert.throws(()=>parseQuestionExcelSheet(sheet([['Class',...headers.slice(1)],row])),/header mismatch/);
assert.throws(()=>parseQuestionExcelSheet(sheet([headers])),/1–500/);
const formulas=sheet([headers,row]);
const old=formulas.getRow;
formulas.getRow=n=>{
 const current=old(n);
 return {getCell:i=>n===2&&i===5?{text:'1',value:{formula:'2-1',result:1}}:current.getCell(i)};
};
assert.throws(()=>parseQuestionExcelSheet(formulas),/formulas are not allowed/);
assert.throws(()=>parseQuestionExcelSheet(sheet([headers,...Array.from({length:502},()=>row)])),/at most 500/);
console.log('PASS V46 Excel question bank headers, bilingual fields, formula refusal and row limits');
