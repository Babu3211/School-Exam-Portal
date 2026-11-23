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
