import assert from 'node:assert/strict';
import {renderIemisGradeSheetPrint,createIemisGradeSheetPrinter,combineTerminalGradeSheets} from './iemis-grade-sheet-print-preview.mjs';
import {iemisEntrySchema} from '../iemis-entry.js';
import {previewIemisGradeSheet} from './iemis-grade-sheet-preview.mjs';
const students=[{id:'s1',nameEnglish:'<script>alert(1)</script>'}];
const subjects=[{id:'english',name:'English & <Science>',creditHour:4}];
const schema=iemisEntrySchema('1','first','English & <Science>');
const draft={values:Object.fromEntries(schema.filter(x=>!x.readonly).map(x=>[x.key,x.key==='count'?'10':x.key==='obtained'?'35':String(x.max)])),isAbsent:false,incompatible:false};
const args={school:{nameEnglish:'<img src=x onerror=alert(1)>',addressEnglish:'Main & School Road'},classNo:'1',term:'1st',students,subjects,draftsBySubject:{english:{s1:draft}},studentId:'s1'};
const result=renderIemisGradeSheetPrint(args);
assert.equal(result.ready,true);
const sheet=previewIemisGradeSheet(args).student;
const summary=sheet.subjects[0].summary;
const sourceGrade=summary.totalGrade.grade;
assert.match(result.html,new RegExp('<td>'+summary.obtained+' / '+summary.full+'</td>'));
assert.match(result.html,new RegExp('<td>'+summary.totalGrade.point+'</td>'));
assert.match(result.html,new RegExp('GPA: '+sheet.gpa.toFixed(2)));
assert.match(result.html,new RegExp('<td>'+summary.inGrade.grade+'</td>'));
assert.match(result.html,new RegExp('<td>'+sourceGrade.replace('+','\\+')+'</td>'));
assert.match(result.html,/<td>—<\/td>/); // Primary class has no theory grade.
assert.match(result.html,/PREVIEW ONLY/);assert.match(result.html,/NOT VALID FOR OFFICIAL USE/);assert.match(result.html,/@page/);
assert.match(result.html,/Obtained \/ Full/);assert.match(result.html,/Grade Point/);
assert.match(result.html,/Internal Grade/);assert.match(result.html,/Theory Grade/);assert.match(result.html,/Total Grade/);
assert.match(result.html,/noindex,nofollow/);
assert.match(result.html,/background-repeat:repeat/);assert.match(result.html,/background-size:240px 160px/);
assert.match(result.html,/&lt;script&gt;/);assert.match(result.html,/&lt;img/);assert.match(result.html,/English &amp; &lt;Science&gt;/);
assert.doesNotMatch(result.html,/<script>|<img/);
const incomplete=renderIemisGradeSheetPrint({...args,draftsBySubject:{english:{}}});assert.equal(incomplete.ready,false);assert.equal(incomplete.html,null);
assert.throws(()=>renderIemisGradeSheetPrint({...args,school:{nameEnglish:''}}),/school name/);
assert.throws(()=>renderIemisGradeSheetPrint({...args,school:{...args.school,addressEnglish:'x'.repeat(251)}}),/Invalid school address/);
assert.throws(()=>renderIemisGradeSheetPrint({...args,school:{...args.school,addressEnglish:42}}),/Invalid school address/);
assert.throws(()=>renderIemisGradeSheetPrint({...args,school:{...args.school,nameEnglish:'x'.repeat(161)}}),/Valid school name/);

for(const classNo of ['1','2','3','4','5','6','7','8','9','10'])for(const [term,v46term] of [['1st','first'],['2nd','second'],['3rd','third'],['final','annual']]){
 const name='English',schema=iemisEntrySchema(classNo,v46term,name);
 const values=Object.fromEntries(schema.filter(field=>!field.readonly).map(field=>[field.key,field.key==='count'?'10':field.key==='obtained'?'35':String(field.max)]));
 const candidate={...args,classNo,term,subjects:[{id:'english',name,creditHour:4}],draftsBySubject:{english:{s1:{values,isAbsent:false,incompatible:false}}}};
 const calculated=previewIemisGradeSheet(candidate);
 const printed=renderIemisGradeSheetPrint(candidate);
 assert.equal(printed.ready,calculated.ready,'readiness parity for class '+classNo+' term '+term);
 if(!calculated.ready){assert.equal(printed.html,null);continue}
 assert.ok(printed.html.includes(term==='final'?'@page{size:A4 portrait;margin:10mm}':'@page{size:A5 portrait;margin:6mm}'));
 assert.ok(printed.html.includes(term==='final'?'width:190mm;min-height:276mm':'width:136mm;min-height:197mm'));
 assert.match(printed.html,/border:1\.4mm solid #1000cc/);
 assert.match(printed.html,/border:\.55mm solid #1000cc/);
 assert.match(printed.html,/border-color:#1000cc/);
 assert.match(printed.html,/background-repeat:repeat/);
 assert.match(printed.html,/NOT VALID FOR OFFICIAL USE/);
 const subject=calculated.student.subjects[0].summary;
 assert.match(printed.html,new RegExp('<td>'+subject.obtained+' / '+subject.full+'</td>'));
 assert.ok(printed.html.includes('<td>'+subject.inGrade.grade+'</td>'));
 assert.ok(printed.html.includes('<td>'+(subject.theoryGrade?.grade??'—')+'</td>'));
 assert.ok(printed.html.includes('<td>'+subject.totalGrade.grade+'</td>'));
 assert.ok(printed.html.includes('<td>'+subject.totalGrade.point+'</td>'));
 assert.ok(printed.html.includes('GPA: '+calculated.student.gpa.toFixed(2)));
}



const bodyRows=result.html.split('<tbody>');
assert.equal(bodyRows.length,2);
assert.equal((bodyRows[1].split('</tbody>')[0].match(/<td>/g)||[]).length,8,'each printed subject row must match all eight headers');
assert.equal((result.html.match(/<th>/g)||[]).length,8,'exactly eight grade sheet headers');
assert.equal((result.html.match(/\x3ctd>—\x3c\/td>/g)||[]).length,1,'primary class theory is the only non-applicable grade');

const bilingual=renderIemisGradeSheetPrint({...args,school:{...args.school,nameNepali:'विद्यालय & <script>',addressNepali:'काठमाडौं & <img>'}});
assert.equal(bilingual.ready,true);
assert.match(bilingual.html,/lang="ne"/);
assert.match(bilingual.html,/विद्यालय &amp; &lt;script&gt;/);
assert.match(bilingual.html,/काठमाडौं &amp; &lt;img&gt;/);
assert.doesNotMatch(bilingual.html,/<script>|<img>/);
assert.throws(()=>renderIemisGradeSheetPrint({...args,school:{...args.school,nameNepali:123}}),/Invalid Nepali school name/);
assert.throws(()=>renderIemisGradeSheetPrint({...args,school:{...args.school,addressNepali:'x'.repeat(251)}}),/Invalid Nepali school address/);

console.log('V47 offline A4 grade sheet preview escaping, watermark and incomplete-class tests passed');

const cachedArgs=structuredClone(args);
cachedArgs.students[0].studentIemisNo='0000123';
cachedArgs.students[0].symbolNo='SYM<1>';
cachedArgs.students[0].dob='2080-01-01';
const printer=createIemisGradeSheetPrinter(cachedArgs);
const initial=printer('s1');
assert.match(initial.html,/Registration No.: 0000123/);
assert.match(initial.html,/Symbol No.: SYM&lt;1&gt;/);
assert.match(initial.html,/Date of Birth: 2080-01-01/);
assert.match(initial.html,/GPA: 3\.60/);
assert.match(initial.html,/print-color-adjust:exact/);
cachedArgs.draftsBySubject.english.s1.values.obtained='0';
cachedArgs.students[0].nameEnglish='Changed after snapshot';
assert.deepEqual(printer('s1'),initial,'Cached print must retain the verified snapshot');
assert.throws(()=>printer('other'),/not in selected class/);
assert.equal(createIemisGradeSheetPrinter({...args,draftsBySubject:{english:{}}})('s1').ready,false);
console.log('PASS cached grade-sheet printing: verified roster, immutable snapshot, escaped identifiers, two-decimal GPA and print watermark');

{
 const pairArgs=structuredClone(args);
 pairArgs.students.push({id:'s2',nameEnglish:'Second & Student'});
 pairArgs.draftsBySubject.english.s2=structuredClone(draft);
 const print=createIemisGradeSheetPrinter(pairArgs);
 const pair=combineTerminalGradeSheets(print,['s1','s2'],'1st');
 assert.equal(pair.ready,true);
 assert.match(pair.html,/@page\{size:A4 landscape;margin:6mm\}/);
 assert.match(pair.html,/grid-template-columns:136mm 136mm;gap:8mm/);
 assert.equal((pair.html.match(/<main class="sheet">/g)||[]).length,2);
 assert.equal((pair.html.match(/NOT VALID FOR OFFICIAL USE/g)||[]).length,2);
 for(const id of ['s1','s2']){
  const original=print(id).html.split('<body>')[1].split('</body>')[0];
  assert.ok(pair.html.includes(original),'Original student data and markup unchanged');
 }
 assert.throws(()=>combineTerminalGradeSheets(print,['s1','s1'],'1st'),/distinct/);
 assert.throws(()=>combineTerminalGradeSheets(print,['s1','s2'],'final'),/terminal/);
 assert.throws(()=>combineTerminalGradeSheets(print,['s1','s2'],'2nd'),/Original terminal/);
 assert.equal(combineTerminalGradeSheets(()=>({ready:false}),['s1','s2'],'1st').ready,false);
 console.log('PASS two terminal cards per A4 landscape: original student markup and watermark unchanged');
}

import {renderGradeSheetLayoutSample} from './iemis-grade-sheet-print-preview.mjs';
for(const term of ['1st','final']){
 const sample=renderGradeSheetLayoutSample(term);
 assert.equal(sample.ready,true);assert.match(sample.html,/SAMPLE DESIGN ONLY/);assert.match(sample.html,/NOT VALID FOR OFFICIAL USE/);assert.match(sample.html,/GPA: —/);assert.match(sample.html,/Blank layout only/);assert.match(sample.html,/background-repeat:repeat/);
 assert.ok(sample.html.includes(term==='final'?'@page{size:A4 portrait':'@page{size:A5 portrait'));
 assert.doesNotMatch(sample.html,/GPA: [0-9]|<script/);
}
assert.throws(()=>renderGradeSheetLayoutSample('monthly'));
console.log('PASS blank Terminal and Final design previews reuse the existing renderer, no marks or GPA');
