import assert from 'node:assert/strict';
import {QUESTION_EXCEL_FIELDS,parseQuestionExcelSheet,CDC_GRID_EXCEL_FIELDS,parseCdcGridExcelSheet} from '../cdc-question-excel.mjs';
import {aggregateExactCdcGrid} from '../cdc-exact-grid.mjs';
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
// Round-trip a genuine XLSX workbook using the browser ExcelJS bundle
// already shipped locally by SMSS (not only a fake worksheet adapter).
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const browser=new JSDOM('<!doctype html><html><body></body></html>',{
 url:'https://example.test/',runScripts:'outside-only'
});
browser.window.eval(readFileSync(
 new URL('../iemis-importer/vendor/exceljs.min.js',import.meta.url),'utf8'));
const ExcelJS=browser.window.ExcelJS;
assert.ok(ExcelJS?.Workbook,'Local browser ExcelJS library must expose Workbook');
const book=new ExcelJS.Workbook();
const work=book.addWorksheet('Question Bank');
// ExcelJS UMD is evaluated inside a browser realm; build its input
// arrays in that same realm (host Node arrays are not instanceof window.Array).
work.addRow(browser.window.Array.from(headers));
work.addRow(browser.window.Array.from(row));
assert.equal(work.getRow(1).getCell(1).text,'Unit Code',
 'Sample header must exist before exporting XLSX');
const packed=await book.xlsx.writeBuffer();
assert.ok(packed.byteLength>100,'Real Excel export must contain file bytes');
const reopened=new ExcelJS.Workbook();
await reopened.xlsx.load(new browser.window.Uint8Array(packed));
const loadedSheet=reopened.getWorksheet('Question Bank');
assert.equal(loadedSheet.rowCount,2,'XLSX reload must retain two data rows');
const reread=parseQuestionExcelSheet(loadedSheet);
assert.equal(reread.length,1);
assert.equal(reread[0].answerEn,'Three');
assert.equal(reread[0].unitCode,'1');
// These rows are explicitly synthetic tests, never claimed to be CDC grids.
const gridHeaders=CDC_GRID_EXCEL_FIELDS.map(row=>row[1]);
const syntheticGrid=[
 ['1','mcq','1','2','knowledge'],
 ['2','short','2','2','application']
];
const fakeGrid=parseCdcGridExcelSheet(sheet([gridHeaders,...syntheticGrid]));
assert.deepEqual(fakeGrid,[
 {unitCode:'1',type:'mcq',marks:1,count:2,cognitiveLevel:'knowledge'},
 {unitCode:'2',type:'short',marks:2,count:2,cognitiveLevel:'application'}
]);
assert.equal(aggregateExactCdcGrid(fakeGrid).fullMarks,6);
assert.throws(()=>parseCdcGridExcelSheet(sheet([['Other',...gridHeaders.slice(1)],
 ...syntheticGrid])),/header mismatch/);
assert.throws(()=>parseCdcGridExcelSheet(sheet([gridHeaders])),/needs 1–120/);
assert.throws(()=>parseCdcGridExcelSheet(sheet([gridHeaders,['1','short','2','1.5','knowledge']])),/Invalid CDC Grid/);
assert.throws(()=>parseCdcGridExcelSheet(sheet([gridHeaders,['x','mcq','1','1','knowledge']])),/Invalid CDC Grid/);
const formulaGrid=sheet([gridHeaders,...syntheticGrid]);
const origGetRow=formulaGrid.getRow;
formulaGrid.getRow=n=>{
 const original=origGetRow(n);
 return {getCell:i=>n===2&&i===3?
   {text:'1',value:{formula:'2-1',result:1}}:original.getCell(i)};
};
assert.throws(()=>parseCdcGridExcelSheet(formulaGrid),/formulas are not allowed/);
assert.throws(()=>parseCdcGridExcelSheet(sheet([
 gridHeaders,...Array.from({length:121},()=>syntheticGrid[0])
])),/no more than 120/);
// Real ExcelJS .xlsx round-trip using the same bundled browser library.
const gridBook=new ExcelJS.Workbook();
const gridWorksheet=gridBook.addWorksheet('CDC Unit Grid');
gridWorksheet.addRow(browser.window.Array.from(gridHeaders));
for(const record of syntheticGrid)
 gridWorksheet.addRow(browser.window.Array.from(record));
const gridBytes=await gridBook.xlsx.writeBuffer();
const reopenedGrid=new ExcelJS.Workbook();
await reopenedGrid.xlsx.load(new browser.window.Uint8Array(gridBytes));
const realGrid=parseCdcGridExcelSheet(reopenedGrid.getWorksheet('CDC Unit Grid'));
assert.deepEqual(realGrid,fakeGrid);
assert.equal(aggregateExactCdcGrid(realGrid).questionCount,4);
console.log('PASS reviewed CDC Grid XLSX import, real binary round-trip, strict schema and no fabricated marks');
browser.window.close();
console.log('PASS genuine XLSX write/read round-trip through locally bundled ExcelJS');
console.log('PASS V46 Excel question bank headers, bilingual fields, formula refusal and row limits');
