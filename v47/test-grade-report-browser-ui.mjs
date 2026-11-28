import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const ui=get('./grade-report-console.mjs'),read=get('./verified-legacy-grade-report.mjs'),hub=get('./index.html');
for(const name of ['grade-ledger','grade-sheet','mark-ledger','mark-entry-ledger']){
 const html=get('./'+name+'.html');
 assert.match(html,/DEVELOPMENT PREVIEW — NOT VALID FOR OFFICIAL USE/);
 assert.match(html,/grade-report-console\.mjs/);
 for(const id of ['schoolId','email','password','login','logout','schoolClass','term','reportSource','load','cancel','gradeOutput','exportExcel','student','previewSheet','printSheet','sheetFrame'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/sandbox="allow-same-origin allow-modals"/);
 assert.doesNotMatch(html,/allow-scripts/);
 assert.doesNotMatch(html,/firebaseConfig|apiKey|password[^>]*value=/);
 assert.match(hub,new RegExp('href="\\./'+name+'\\.html"'));
}
assert.match(ui,/verifySchoolSession\(/);
assert.match(ui,/loadVerifiedLegacyGradeReport\(/);
assert.match(ui,/await verifyAgain\(/);
assert.match(ui,/enforceSchoolIdle\(/);
assert.match(ui,/clearReview\(/);
assert.match(ui,/srcdoc/);
assert.match(ui,/frame\.onload=/);
assert.match(ui,/sheetSeq!==seq/);
assert.match(ui,/frame\.dataset\.loadedStudent!==studentId/);
assert.match(ui,/frame\.contentWindow\.print\(\)/);
assert.match(ui,/legacyGradePreviewExcel\(/);
assert.match(ui,/\.xlsx/);
assert.match(read,/loadCompleteClassRoster\(/);
assert.match(read,/loadAllClassMarks\(/);
assert.match(read,/maxRecords:30000/);
assert.match(read,/after\.role!==before\.role/);
assert.match(read,/prepareLegacyGradeReport\(/);
assert.match(read,/Cross-school profile blocked/);
assert.doesNotMatch(ui,/\.setDoc\(|\.addDoc\(|\.updateDoc\(|\.runTransaction\(|\.writeBatch\(|\.deleteDoc\(/);
assert.doesNotMatch(ui,/\.csv/);
for(const path of ['iemis-v46-ledger-adapter.mjs','iemis-authorized-class-ledger.mjs','iemis-record-compatibility.mjs'])
 assert.doesNotMatch(get('./'+path),/from '\.\.\/iemis-(?:entry|ledger)\.js'/,'Grade preview must only import deployed V47-local V46 parity copy');
assert.match(ui,/const reportMode=\['number','entry'\]\.includes/);
assert.match(ui,/data\.ledgers\?\.\[reportMode\]/);
assert.match(ui,/legacyGradePreviewExcel\(report,reportMode\)/);
for(const [name,type] of [['mark-ledger','number'],['mark-entry-ledger','entry']]){
 const html=get('./'+name+'.html');
 assert.match(html,new RegExp('data-report="'+type+'"'));
 assert.match(html,/PREVIEW ONLY — NOT VALID FOR OFFICIAL USE/);
 const links=[...hub.matchAll(new RegExp('<a[^>]+href="\\./'+name+'\\.html"','g'))];
 assert.ok(links.length>=2,'Sidebar and Quick Menu route missing: '+name);
 assert.ok(links.every(m=>m[0].includes('data-school-module')),'School authorization gate missing: '+name);
}
console.log('PASS V46-compatible Mark/Entry/Grade Ledger and Grade Sheet read-only browser routes');

import {loadCommittedReportPreview} from './committed-report-client.mjs';
assert.match(ui,/source==='committed'/);
assert.match(ui,/loadCommittedReportPreview\(/);
assert.match(ui,/reportSource'\)\.onchange=resetReportFilters/);
assert.match(ui,/const resetReportFilters=\(\)=>\{clearReview\(\);resetExamSelection\(\)\}/);
assert.match(ui,/legacyExam'\)\.onchange=clearReview/);
assert.match(ui,/frame\.dataset\.loadedSelection!==sheetKey\(\)/);
assert.match(ui,/combineTerminalGradeSheets\(/);
assert.match(get('./grade-sheet.html'),/id="terminalSecondStudent" disabled/);
const q={schoolId:'12345',classNo:'1',term:'1st'};
const students=[{id:'s1',schoolId:q.schoolId,class:'1',active:true,nameEnglish:'Alpha'}];
const subjects=[{id:'math',schoolId:q.schoolId,class:'1',active:true,name:'Mathematics',creditHour:4}];
const snapshot={...q,school:{nameEnglish:'Test School'},students,subjects,publications:[
 {published:true,schoolId:q.schoolId,classId:'1',subjectId:'math',examId:q.term,publicationId:'pub_math1',digest:'a'.repeat(64),rosterCount:1,
 components:[{key:'count',name:'No. of Learning Achievement',fullMarks:5},{key:'got',name:'Obtained Learning Achievement',fullMarks:20}],
 entries:[{studentId:'s1',isAbsent:false,values:{count:5,got:18},totalObtained:23}]}]};
const body={snapshot,previewOnly:true,cdcGradeApproved:false};
let requests=0,changed=false;
const options={...q,getIdToken:async()=>'test-token',assertCurrent:()=>{if(changed)throw Error('Session changed')},
 fetchImpl:async(url,opts)=>{requests++;assert.equal(url,'/api/v47/committed-report?schoolId=12345&classId=1&examId=1st');
 assert.equal(opts.headers.Authorization,'Bearer test-token');assert.equal(opts.cache,'no-store');assert.equal(opts.redirect,'error');
 return {ok:true,json:async()=>body}}};
const report=await loadCommittedReportPreview(options);
assert.equal(report.summary.rows[0].gpa,4);assert.equal(report.previewOnly,true);
assert.equal(requests,1);
for(const invalid of [{...body,cdcGradeApproved:true},{...body,snapshot:{...snapshot,schoolId:'99999'}}])
 await assert.rejects(loadCommittedReportPreview({...options,fetchImpl:async()=>({ok:true,json:async()=>invalid})}),/Unexpected or foreign/);
await assert.rejects(loadCommittedReportPreview({...options,fetchImpl:async()=>({ok:false})}),/unavailable/);
await assert.rejects(loadCommittedReportPreview({...options,fetchImpl:async()=>({ok:true,json:async()=>{throw Error('HTML')}})}),/static Hosting/);
await assert.rejects(loadCommittedReportPreview({...options,fetchImpl:async()=>{changed=true;return {ok:true,json:async()=>body}}}),/Session changed/);
console.log('PASS V47 committed report browser client: scoped preview, no fallback, unavailable API, stale session and foreign payload refused');

import {assertLegacyReportGridCount} from './verified-legacy-grade-report.mjs';
import {neError} from './nepali-feedback.mjs';
assert.doesNotThrow(()=>assertLegacyReportGridCount(22,8,176));
for(const [students,subjects,records] of [[11,6,0],[22,8,22],[25,8,24],[1,1,2]]){
 assert.throws(()=>assertLegacyReportGridCount(students,subjects,records),e=>e.code==='smss/incomplete-legacy-grid'&&e.reportCounts.expected===students*subjects&&neError(e).includes(String(records)+' अङ्क अभिलेख'));
}
assert.throws(()=>assertLegacyReportGridCount(22,8,-1),/Invalid report inventory/);
assert.match(read,/if\(after\.role!==before\.role\)[\s\S]*?assertLegacyReportGridCount\(roster\.count,subjects\.length,marks\.records\.length\)[\s\S]*?prepareLegacyGradeReport\(/);
console.log('PASS real inventory count mismatch blocks report with precise Nepali guidance; no grading or permission changes');
