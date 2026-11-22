import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const read=name=>readFileSync(resolve(root,name),'utf8');
const checks=[
 ['V46 IEMIS calculation source is frozen',()=>read('v46-iemis-ledger.js').includes('export function iemisGpa')],
 ['Read-only class GPA preview is available',()=>read('complete-class-result-preview.mjs').includes('previewV46Gpa')],
 ['Roster completeness gate is present',()=>read('class-marks-coverage.mjs').includes('verifyClassMarksCoverage')],
 ['V47 marks Firestore rules deny unverified writes',()=>/match \/marks\/\{id\}/.test(read('firestore.rules'))&&/allow (?:write|create|update): if false/.test(read('firestore.rules'))],
 ['V47 grade sheet UI is implemented',()=>{try{return read('grade-sheet.html').includes('iemis')}catch{return false}}],
 ['V47 grade ledger UI is implemented',()=>{try{return read('grade-ledger.html').includes('iemis')}catch{return false}}],
 ['V47 marks entry Save and Publish are enabled',()=>!/id="(?:save|publish)"[^>]*disabled/.test(read('marks-entry.html'))],
 ['V47 main dashboard is not a development hub',()=>!/Development only|development workspace|independent prototypes/i.test(read('index.html'))],
 ['Full class mark-save limit removed',()=>!/complete\\.count\\s*>\\s*3/.test(read('verified-small-class-mark-save.mjs'))],
];
let failed=0;
for(const [label,test] of checks){let ok=false;try{ok=!!test()}catch{}console.log((ok?'PASS':'BLOCKED')+' '+label);if(!ok)failed++}
console.log('V47 release checklist: '+(checks.length-failed)+'/'+checks.length+' checks met');
if(failed)process.exitCode=1;
