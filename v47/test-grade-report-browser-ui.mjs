import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const ui=get('./grade-report-console.mjs'),read=get('./verified-legacy-grade-report.mjs'),hub=get('./index.html');
for(const name of ['grade-ledger','grade-sheet','mark-ledger','mark-entry-ledger']){
 const html=get('./'+name+'.html');
 assert.match(html,/DEVELOPMENT PREVIEW — NOT VALID FOR OFFICIAL USE/);
 assert.match(html,/grade-report-console\.mjs/);
 for(const id of ['schoolId','email','password','login','logout','schoolClass','term','load','cancel','gradeOutput','exportExcel','student','previewSheet','printSheet','sheetFrame'])
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
