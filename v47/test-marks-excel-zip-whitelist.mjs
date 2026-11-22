import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAllowedMarksExcelZipPart} from './import-class-marks-excel.mjs';

const accepted=[
 'xl/worksheets/sheet1.xml','xl/workbook.xml','xl/sharedStrings.xml',
 '[Content_Types].xml','_rels/.rels','xl/_rels/workbook.xml.rels'
];
for(const name of accepted)assert.equal(isAllowedMarksExcelZipPart(name),true,'Required SMSS workbook part '+name);
for(const name of [
 'xl/worksheets/sheet2.xml','xl/media/image1.png','xl/embeddings/object1.bin',
 'xl/../other.xml','../xl/workbook.xml','xl\\workbook.xml',
 'xl/workbook.xml.bak','xl/workbookXxml','xl//workbook.xml',
 'XL/workbook.xml','file:///xl/workbook.xml','',null,42
])assert.equal(isAllowedMarksExcelZipPart(name),false,'Unsafe or unknown workbook part '+String(name));
const source=readFileSync(new URL('./import-class-marks-excel.mjs',import.meta.url),'utf8');
assert.match(source,/if\(!isAllowedMarksExcelZipPart\(name\)\)/,
 'XLSX parser must actually use the allowlist');
assert.match(source,/students\.some\(s=>!isActiveEnrolledStudent\(s\)\)/,
 'Legacy imported student without active field is valid, explicit inactive is rejected');
console.log('V47 class marks XLSX ZIP allowlist: 6 accepted parts, traversal and unexpected parts rejected');
