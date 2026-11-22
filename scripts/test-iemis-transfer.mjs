import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../iemis-importer/vendor/exceljs.min.js';
import '../iemis-importer/transfer.js';
import {buildIemisTransferExport} from '../iemis-transfer-export.js';

const transfer = globalThis.SmssIemisTransfer;
const ExcelJS = globalThis.ExcelJS;
assert.ok(ExcelJS?.Workbook);
const context = {schoolCode:'TEST-SCHOOL',year:'2083',className:'Class 6',term:'first',section:'All'};
const student = {id:'test-a',studentName:'Synthetic Student',studentIemisNo:'TEST-REG',symbolNo:'001',rollNo:7};
const components = [
  {name:'Participation',fullMarks:4},
  {name:'Practical/Project',fullMarks:36},
  {name:'First Term Examination',fullMarks:10}
];
const record = {studentId:student.id,examId:'test-exam',subject:'Nepali',scores:components.map((part,i)=>({...part,obtained:[0,24,8][i]}))};
const build = options => buildIemisTransferExport({context,students:[student],subjects:['Nepali'],records:[record],examId:'test-exam',componentsFor:()=>components,label:s=>s,applicable:()=>true,roll:s=>s.rollNo,...options});
const grid = build();
const cells = grid.rows.map(row=>row.map((value,i)=>({value:i<4?'':i===4?false:'',readonly:i<4,max:null})));
const target = {...grid,rows:grid.rows.map(row=>row.map((v,i)=>i<4?v:i===4?false:'')),cells};
const data = await transfer.makeWorkbook(ExcelJS,grid);
const roundtrip = await transfer.workbookData(ExcelJS,data);
assert.equal(roundtrip.rows[0][3],'001','Symbol leading zeros must survive XLSX');
assert.equal(roundtrip.rows[0][5],'0','Zero is an entered mark');
const plan = transfer.makePlan(roundtrip,target);
assert.deepEqual(plan.changes.map(c=>c.value),[0,24,8]);
assert.equal(plan.students,1);
const sample = await transfer.workbookData(ExcelJS,await transfer.makeWorkbook(ExcelJS,grid,true));
assert.ok(sample.rows[0].slice(4).every(v=>v===''),'Sample marks stay empty');
assert.throws(()=>transfer.makePlan(sample,target),/नयाँ अंक/);
for(const key of ['schoolCode','year','className','term','section']) {
  assert.throws(()=>transfer.makePlan({...roundtrip,context:{...roundtrip.context,[key]:'different'}},target),/मिलेन/);
}
const clone = () => structuredClone(roundtrip);
const duplicated = clone();duplicated.rows.push(duplicated.rows[0]);
assert.throws(()=>transfer.makePlan(duplicated,target),/दोहोरिएको/);
const wrongId = clone();wrongId.rows[0][2]='MISSING';
assert.throws(()=>transfer.makePlan(wrongId,target),/पहिचान भेटिएन/);
const wrongName = clone();wrongName.rows[0][1]='Different Student';
assert.throws(()=>transfer.makePlan(wrongName,target),/नाम र पहिचान/);
const wrongSymbol = clone();wrongSymbol.rows[0][3]='002';
assert.throws(()=>transfer.makePlan(wrongSymbol,target),/एउटै विद्यार्थीका/);
const over = clone();over.rows[0][5]='5';
assert.throws(()=>transfer.makePlan(over,target),/पूर्णाङ्कभन्दा/);
const wrongMax = clone();wrongMax.columns[1].label='Participation(3)';
assert.throws(()=>transfer.makePlan(wrongMax,target),/पूर्णाङ्क मिलेन/);
const absentMarks = clone();absentMarks.rows[0][4]='TRUE';
assert.throws(()=>transfer.makePlan(absentMarks,target),/अनुपस्थित/);
const absence = clone();absence.rows[0].fill('',5);absence.rows[0][4]='TRUE';
assert.deepEqual(transfer.makePlan(absence,target).changes.map(c=>c.value),[true]);
const before = structuredClone(target);before.cells[0][5].value='1';
assert.throws(()=>transfer.makePlan(roundtrip,before),/पहिल्यै अंक/);
assert.equal(transfer.makePlan(roundtrip,before,true).changes.length,3);
const negative = clone();negative.rows[0][5]='-1';assert.throws(()=>transfer.makePlan(negative,target),/सकारात्मक/);
const duplicateColumn = clone();duplicateColumn.columns.push(duplicateColumn.columns[0]);assert.throws(()=>transfer.makePlan(duplicateColumn,target),/दोहोरिएको/);
const unknownSubject = clone();unknownSubject.columns[0].subject='Unknown Subject';assert.throws(()=>transfer.makePlan(unknownSubject,target),/भेटिएन/);
const unrelated = structuredClone(target);unrelated.cells[0][5].unavailable=true;assert.throws(()=>transfer.makePlan(roundtrip,unrelated),/लागू हुँदैन/);
const ambiguous = {...target,rows:[...target.rows,...target.rows],cells:[...target.cells,...target.cells]};assert.throws(()=>transfer.makePlan(roundtrip,ambiguous),/दोहोरिएको/);
assert.equal(transfer.makePlan(transfer.parsePaste(roundtrip.rows.map(r=>r.join('\t')).join('\n'),target),target).changes.length,3);
assert.throws(()=>transfer.parsePaste('0\t24\t8',target),/विद्यार्थी column/);
const formulaBook = new ExcelJS.Workbook();await formulaBook.xlsx.load(data);formulaBook.getWorksheet('Marks').getCell('F3').value={formula:'1+1',result:2};
await assert.rejects(()=>formulaBook.xlsx.writeBuffer().then(b=>transfer.workbookData(ExcelJS,b)),/Formula/);
assert.equal(transfer.subjectKey('OPT.II COMPUTER SCIENCE (3031)'),transfer.subjectKey('ऐच्छिक द्वितीय: कम्प्युटर विज्ञान'));
assert.equal(transfer.subjectKey('Hamro Serofero'),transfer.subjectKey('Serophero'));
assert.equal(transfer.componentKey('First Term Examination(10)'),transfer.componentKey('Total of Term(10)'));
assert.equal(transfer.termKey('Annual'),'final');
assert.throws(()=>build({records:[record,record]}),/duplicate/);
assert.throws(()=>build({records:[{...record,scores:[{name:'Participation',fullMarks:3,obtained:2}]}]}),/पूर्णाङ्क फरक/);
assert.deepEqual(build({records:[]}).rows[0].slice(4),['','','','']);
assert.deepEqual(build({applicable:()=>false}).rows[0].slice(4),['N/A','N/A','N/A','N/A']);
// Primary achievement cells use count × 4, with a read-only full-mark column.
const primary = build({context:{...context,className:'Class 1'},records:[{...record,scores:[{name:'No. of Learning Achievement',fullMarks:10,obtained:10},{name:'Full Marks',fullMarks:40,obtained:null},{name:'Obtained Learning Achievement',fullMarks:40,obtained:35}]}]});
assert.deepEqual(primary.rows[0].slice(4),['FALSE','10','40','35']);
const pfile = await transfer.workbookData(ExcelJS,await transfer.makeWorkbook(ExcelJS,primary));
const ptarget = {...primary,cells:primary.rows.map(r=>r.map((v,i)=>({value:i===4?false:'',readonly:i===6,max:null}))),rows:primary.rows.map(r=>r.map((v,i)=>i<4?v:''))};
assert.deepEqual(transfer.makePlan(pfile,ptarget).changes.map(c=>c.value),[10,35]);
const changedCount=structuredClone(pfile);changedCount.rows[0][5]='2';changedCount.rows[0][6]='';changedCount.rows[0][7]='';const existingPrimary=structuredClone(ptarget);existingPrimary.cells[0][5].value='10';existingPrimary.cells[0][7].value='35';assert.throws(()=>transfer.makePlan(changedCount,existingPrimary,true),/संख्या × ४/);
pfile.rows[0][7]='41';assert.throws(()=>transfer.makePlan(pfile,ptarget),/संख्या × ४/);
// Multiple subjects retain two grouped rows and their exact component counts.
const multi=build({subjects:['Nepali','English']});
const multiBook=await transfer.workbookData(ExcelJS,await transfer.makeWorkbook(ExcelJS,multi));
assert.equal(multiBook.columns.length,8);assert.equal(multiBook.columns[4].subject,'English');
const manifest=JSON.parse(readFileSync('iemis-importer/manifest.json','utf8'));
assert.deepEqual(manifest.content_scripts[0].matches,['https://emis.cehrd.gov.np/*']);
assert.equal(manifest.permissions,undefined);
console.log('XLSX roundtrip, grouped columns, primary achievement, identities, context, blanks, zero, absence, overwrites, bounds and permissions passed');
