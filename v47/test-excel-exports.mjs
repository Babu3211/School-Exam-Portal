import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {excelWorkbook} from './excel-workbook.mjs';
const file=new Uint8Array(await excelWorkbook(['Student ID','Name','Score'],[['001','=2+2',42],['002','नमूना',0]]).arrayBuffer());
assert.equal(file[0],0x50);assert.equal(file[1],0x4b);
const decoder=new TextDecoder(),raw=decoder.decode(file);
assert.match(raw,/xl\/worksheets\/sheet1.xml/);
assert.match(raw,/001/);
assert.match(raw,/=2\+2/);
assert.doesNotMatch(raw,/<f>/,'Text formulas must never become executable formulas');
const pages=['marks-preview-console.mjs','ledger-exceptions-console.mjs'];
for(const page of pages){
 const source=readFileSync(new URL(page,import.meta.url),'utf8');
 assert.match(source,/excelWorkbook\(/);
 assert.match(source,/\.xlsx/);
 assert.doesNotMatch(source,/\.csv'/);
}
console.log('V47 real XLSX signature, content and export wiring tests passed');
