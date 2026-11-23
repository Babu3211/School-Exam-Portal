import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const ui=get('./grade-report-console.mjs'),read=get('./verified-legacy-grade-report.mjs'),hub=get('./index.html');
for(const name of ['grade-ledger','grade-sheet']){
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
console.log('PASS verified IEMIS Grade Ledger/Sheet browser routes, tenant session guard, no saving, only preview XLSX');
