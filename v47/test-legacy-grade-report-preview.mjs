import assert from 'node:assert/strict';
import {prepareLegacyGradeReport,legacyGradePreviewExcel} from './legacy-grade-report-preview.mjs';
import {iemisEntrySchema,iemisEntryValues} from './iemis-entry.js';
const schoolId='300160003',classNo='1',term='1st',school={nameEnglish:'Test & <School>',addressEnglish:'Kathmandu'};
const students=[{id:'s1',schoolId,class:classNo,active:true,nameEnglish:'Alpha'},{id:'s2',schoolId,class:classNo,active:true,nameEnglish:'Beta'}];
const subjects=[{id:'english',schoolId,class:classNo,active:true,name:'English',creditHour:4},{id:'nepali',schoolId,class:classNo,active:true,name:'Nepali',creditHour:5}];
const records=students.flatMap(s=>subjects.map(sub=>({...iemisEntryValues(iemisEntrySchema(classNo,'first',sub.name),{values:{count:'10',obtained:'35'},isAbsent:false,incompatible:false}),schoolId,class:classNo,term,examId:term,studentId:s.id,subjectId:sub.id,subject:sub.name})));
const args={schoolId,school,classNo,term,students,subjects,records},r=prepareLegacyGradeReport(args);
assert.equal(r.rosterCount,2);assert.equal(r.previewOnly,true);
assert.equal(r.publicationAllowed,false);assert.equal(r.writeAuthorized,false);
assert.equal(r.summary.complete,true);assert.match(r.ledger.head,/Final GPA/);
assert.deepEqual(r.ledgers.grade,r.ledger,'Existing grade ledger must remain unchanged');
assert.equal(typeof Object.getOwnPropertyDescriptor(r.ledgers,'number').get,'function','Number table must be lazy');
assert.equal(typeof Object.getOwnPropertyDescriptor(r.ledgers,'entry').get,'function','Entry table must be lazy');
assert.strictEqual(r.ledgers.number,r.ledgers.number,'Number table must be cached after rendering');
assert.strictEqual(r.ledgers.entry,r.ledgers.entry,'Entry table must be cached after rendering');
assert.match(r.ledgers.number.head,/School Name/);
assert.match(r.ledgers.entry.head,/IsAbsent/);
assert.match(r.ledgers.entry.body,/Alpha/);
assert.match(r.ledgers.number.body,/Alpha/);
for(const mode of ['number','entry']){
 const bytes=new Uint8Array(await legacyGradePreviewExcel(r,mode).arrayBuffer());
 assert.deepEqual([...bytes.slice(0,2)],[80,75],'Real XLSX ZIP header required: '+mode);
 assert.match(new TextDecoder().decode(bytes),/NOT FOR OFFICIAL USE/,'Excel warning missing: '+mode);
}
assert.throws(()=>legacyGradePreviewExcel(r,'publish'),/mode/);
const legacyStudent={...students[0]};delete legacyStudent.active;
const legacyReport=prepareLegacyGradeReport({...args,students:[legacyStudent,students[1]]});
assert.equal(legacyReport.rosterCount,2,'Legacy V46 students with missing active field remain enrolled');
assert.equal(legacyReport.printFor('s1').ready,true);
assert.throws(()=>prepareLegacyGradeReport({...args,students:[{...students[0],active:false},students[1]]}),/inactive/);
assert.throws(()=>prepareLegacyGradeReport({...args,students:[{...students[0],active:'true'},students[1]]}),/inactive/);
const sheet=r.printFor('s1');assert.equal(sheet.ready,true);assert.match(sheet.html,/background-repeat:repeat/);assert.match(sheet.html,/Test &amp; &lt;School&gt;/);assert.match(sheet.html,/NOT VALID FOR OFFICIAL USE/);
const bytes=new Uint8Array(await legacyGradePreviewExcel(r).arrayBuffer());assert.deepEqual([...bytes.slice(0,2)],[80,75]);assert.match(new TextDecoder().decode(bytes),/NOT FOR OFFICIAL USE/);
for(const [input,pattern] of [
 [{...args,records:records.slice(1)},/Complete/],
 [{...args,records:[records[0],records[0],records[2],records[3]]},/Duplicate/],
 [{...args,records:records.map((v,i)=>i? v:{...v,scores:undefined,theory:35})},/Raw marks/],
 [{...args,records:records.map((v,i)=>i? v:{...v,schoolId:'999999999'})},/outside/],
 [{...args,students:[students[0],{...students[1],schoolId:'999999999'}]},/Foreign/],
 [{...args,subjects:[subjects[0],{...subjects[1],active:false}]},/subject/],
 [{...args,term:'weekly'},/V46 IEMIS/],
 [{...args,classNo:'11'},/V46 IEMIS/]
])assert.throws(()=>prepareLegacyGradeReport(input),pattern);
assert.throws(()=>legacyGradePreviewExcel({}),/read-only/);
console.log('PASS V47 V46-compatible Grade Ledger and watermarked Grade Sheet preview, Excel, no partial/foreign/raw marks');

import {prepareCommittedIemisReport} from './committed-iemis-report-preview.mjs';
for(const klass of ['6','7','8','9','10'])for(const exam of ['1st','2nd','final']){
 const roster=students.map(s=>({...s,class:klass}));
 const catalog=[{id:'computer',schoolId,class:klass,active:true,name:'Computer Science',creditHour:4},{id:'math',schoolId,class:klass,active:true,name:'Mathematics',creditHour:5}];
 const iemisTerm=exam==='final'?'annual':exam==='1st'?'first':'second';
 const published=catalog.map(sub=>{
  const components=iemisEntrySchema(klass,iemisTerm,sub.name).map((c,i)=>({key:'field'+i,name:c.name,fullMarks:c.max}));
  const values=Object.fromEntries(components.map(c=>[c.key,c.fullMarks]));
  return {published:true,schoolId,classId:klass,subjectId:sub.id,examId:exam,publicationId:'pub_'+sub.id,digest:'a'.repeat(64),rosterCount:roster.length,components,entries:roster.map(s=>({studentId:s.id,isAbsent:false,values,totalObtained:Object.values(values).reduce((a,b)=>a+b,0)}))};
 });
 const input={schoolId,school,classNo:klass,term:exam,students:roster,subjects:catalog,publications:published};
 const report=prepareCommittedIemisReport(input);
 assert.equal(report.summary.complete,true);assert.equal(report.previewOnly,true);
 assert.equal(report.summary.rows[0].gpa,exam==='final'?4:null);
 if(exam==='final')assert.match(report.printFor('s1').html,/NOT VALID FOR OFFICIAL USE/);
 else assert.equal(report.printFor('s1').ready,false,'V46 non-final GPA is intentionally unavailable');
 const alter=fn=>{const copy=structuredClone(input);fn(copy);return copy};
 for(const fn of [
  a=>a.publications.pop(),
  a=>a.publications[0].published=false,
  a=>a.publications[0].schoolId='999999999',
  a=>a.publications[0].components[0].fullMarks++,
  a=>a.publications[0].entries[0].totalObtained++,
  a=>a.publications[0].entries[0].isAbsent=true,
  a=>a.publications[0].entries[1].studentId='s1'
 ])assert.throws(()=>prepareCommittedIemisReport(alter(fn)));
}
assert.throws(()=>prepareCommittedIemisReport({classNo:'1',term:'1st'}),/primary achievement/);
console.log('PASS committed-to-IEMIS preview: Classes 6–10, first/second/final, Computer and Mathematics, complete scope and watermark');
