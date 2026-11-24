import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Prevent already-fixed legacy fixtures and export expectations from returning.
const fixtures=["test-v47-computer-component.mjs","test-v47-mark-save-preflight.mjs","test-v47-mark-create-service.mjs","test-v47-subject-create-service.mjs","test-v47-subject-assignment-create-service.mjs","test-v47-assignment-create-service.mjs"];
for(const file of fixtures){
 const code=readFileSync(new URL('./'+file,import.meta.url),'utf8');
 assert.doesNotMatch(code,/school_001|school_002/,'Legacy school ID in '+file);
 assert.match(code,/12345678/,'Missing IEMIS fixture in '+file);
}
for(const file of ['test-v47-marks-preview-static.mjs','test-v47-ledger-exceptions-console-static.mjs']){
 const code=readFileSync(new URL('./'+file,import.meta.url),'utf8');
 assert.doesNotMatch(code,/rawMarksCsv|ledgerExceptionsCsv/,'Outdated CSV expectation in '+file);
 assert.match(code,/excelWorkbook/,'Missing XLSX export expectation in '+file);
}
const marks=readFileSync(new URL('../v47/marks-entry-console.mjs',import.meta.url),'utf8');
assert.match(marks,/\$\('saveClassMarks'\)\.onclick=\(\)=>status\('अङ्क सुरक्षित गर्ने वा प्रकाशन गर्ने आधिकारिक सुविधा बन्द छ। कुनै अङ्क सुरक्षित भएको छैन।'\)/);
console.log('PASS V47 regression baseline: IEMIS IDs, XLSX export and disabled unaudited marks publishing');
