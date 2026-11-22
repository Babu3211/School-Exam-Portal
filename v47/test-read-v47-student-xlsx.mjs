import assert from 'node:assert/strict';
import {readV47StudentXlsx} from './read-v47-student-xlsx.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
import {STUDENT_EXCEL_HEADERS} from './v46-student-excel-schema.mjs';
await assert.rejects(readV47StudentXlsx({size:2000001,arrayBuffer:async()=>new ArrayBuffer(0)}),RangeError);
await assert.rejects(readV47StudentXlsx({size:3,arrayBuffer:async()=>Uint8Array.from([1,2,3]).buffer}),/Invalid XLSX/);
const workbook=excelWorkbook(STUDENT_EXCEL_HEADERS,[STUDENT_EXCEL_HEADERS.map((_,i)=>i===4?'Sample Student':'')]);
const bytes=await workbook.arrayBuffer();
assert.ok(bytes.byteLength>500);
if(typeof DOMParser==='undefined'){
 await assert.rejects(readV47StudentXlsx({size:bytes.byteLength,arrayBuffer:async()=>bytes}),/Browser XML parser unavailable/);
}
console.log('V47 student XLSX reader input safety checks passed');
