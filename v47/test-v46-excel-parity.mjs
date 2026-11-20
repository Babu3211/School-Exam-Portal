import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const required=['studentExport','studentSample','studentImportFile','staffExport','staffSample','staffImportFile','exportLedgerExcel','sampleLedgerExcel','importLedgerExcel','exportMarksLedgerExcel','exceljs@4.4.0'];
for(const feature of required)assert.ok(root.includes(feature),'V46 Excel feature missing from preserved root: '+feature);
for(const name of ['marks-preview-console.mjs','ledger-exceptions-console.mjs']){
 const source=readFileSync(new URL(name,import.meta.url),'utf8');
 assert.match(source,/excelWorkbook\(/,'V47 diagnostic download must be Excel');
 assert.match(source,/\.xlsx/,'V47 diagnostic download must use .xlsx');
 assert.doesNotMatch(source,/\.csv['`]/,'V47 diagnostic download must not revert to CSV');
}
console.log('V46 Excel workflow preservation and V47 Excel download parity checks passed');
