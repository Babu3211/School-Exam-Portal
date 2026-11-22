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
// The generated workbook is a real ZIP. Reject corrupt directory entries, oversized
// uncompressed declarations and unsupported compression before any import preview.
const asFile=data=>({size:data.byteLength,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)});
const source=new Uint8Array(bytes);
const endSignature=[0x50,0x4b,0x05,0x06];
let eocd=-1;
for(let i=source.length-22;i>=0;i--){
 if(endSignature.every((value,j)=>source[i+j]===value)){eocd=i;break;}
}
assert.ok(eocd>=0,'Workbook must contain ZIP end directory');
const view=new DataView(source.buffer,source.byteOffset,source.byteLength);
const central=view.getUint32(eocd+16,true);
assert.equal(view.getUint32(central,true),0x02014b50);
const corrupted=new Uint8Array(source);
corrupted[central]=0;
await assert.rejects(readV47StudentXlsx(asFile(corrupted)),/Invalid ZIP directory/);
const oversized=new Uint8Array(source);
new DataView(oversized.buffer).setUint32(central+24,1_500_001,true);
await assert.rejects(readV47StudentXlsx(asFile(oversized)),/oversized Excel entry/);
const encrypted=new Uint8Array(source);
new DataView(encrypted.buffer).setUint16(central+8,1,true);
await assert.rejects(readV47StudentXlsx(asFile(encrypted)),/Unsupported or oversized Excel entry/);
console.log('V47 student XLSX reader ZIP safety regression checks passed');
