import assert from 'node:assert/strict';
import {readV47StudentXlsx} from './read-v47-student-xlsx.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
import {STUDENT_EXCEL_HEADERS} from './v46-student-excel-schema.mjs';
await assert.rejects(readV47StudentXlsx({size:2000001,arrayBuffer:async()=>new ArrayBuffer(0)}),RangeError);
await assert.rejects(readV47StudentXlsx({size:3,arrayBuffer:async()=>Uint8Array.from([1,2,3]).buffer}),RangeError);
await assert.rejects(readV47StudentXlsx({size:22,arrayBuffer:async()=>Uint8Array.from([1,2,3]).buffer}),/Excel file size mismatch/);
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
const directory=view.getUint32(eocd+16,true);
let central=directory;
let sheetEntry=-1;
const utf8=new TextDecoder();
for(let i=0;i<view.getUint16(eocd+10,true);i++){
 assert.equal(view.getUint32(central,true),0x02014b50);
 const nameLength=view.getUint16(central+28,true);
 const name=utf8.decode(source.subarray(central+46,central+46+nameLength));
 if(name==='xl/worksheets/sheet1.xml')sheetEntry=central;
 central+=46+nameLength+view.getUint16(central+30,true)+view.getUint16(central+32,true);
}
assert.ok(sheetEntry>=0,'Workbook must contain sheet1.xml');
central=sheetEntry;
const corrupted=new Uint8Array(source);
corrupted[central]=0;
await assert.rejects(readV47StudentXlsx(asFile(corrupted)),/Invalid ZIP directory/);
const oversized=new Uint8Array(source);
new DataView(oversized.buffer).setUint32(central+24,1_500_001,true);
await assert.rejects(readV47StudentXlsx(asFile(oversized)),/oversized Excel entry/);
const encrypted=new Uint8Array(source);
new DataView(encrypted.buffer).setUint16(central+8,1,true);
await assert.rejects(readV47StudentXlsx(asFile(encrypted)),/Unsupported or oversized Excel entry/);
const mismatch=new Uint8Array(source);
const local=view.getUint32(central+42,true);
new DataView(mismatch.buffer).setUint16(local+8,8,true);
await assert.rejects(readV47StudentXlsx(asFile(mismatch)),/Mismatched XLSX ZIP entry/);
const overlap=new Uint8Array(source);
new DataView(overlap.buffer).setUint32(central+20,directory,true);
await assert.rejects(readV47StudentXlsx(asFile(overlap)),/Truncated XLSX|Mismatched XLSX ZIP entry/);
const invalidDirectory=new Uint8Array(source);
new DataView(invalidDirectory.buffer).setUint32(eocd+12,source.length,true);
await assert.rejects(readV47StudentXlsx(asFile(invalidDirectory)),/Invalid XLSX central directory/);
// ZIP requires central and local headers to agree before a payload CRC can
// be checked. Assert both independent validation layers, not one ambiguous error.
const badChecksum=new Uint8Array(source);
new DataView(badChecksum.buffer).setUint32(central+16,0,true);
await assert.rejects(readV47StudentXlsx(asFile(badChecksum)),/Mismatched XLSX ZIP entry/);
const pairedBadChecksum=new Uint8Array(source);
const pairedHeaders=new DataView(pairedBadChecksum.buffer);
pairedHeaders.setUint32(central+16,0,true);
pairedHeaders.setUint32(local+14,0,true);
await assert.rejects(readV47StudentXlsx(asFile(pairedBadChecksum)),/Invalid XLSX entry checksum/);
const corruptWorksheet=new Uint8Array(source);
const worksheetData=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
corruptWorksheet[worksheetData+Math.min(20,view.getUint32(central+20,true)-1)]^=1;
await assert.rejects(readV47StudentXlsx(asFile(corruptWorksheet)),/Invalid XLSX entry checksum/);
const shortDirectory=new Uint8Array(source);
new DataView(shortDirectory.buffer).setUint32(eocd+12,46,true);
await assert.rejects(readV47StudentXlsx(asFile(shortDirectory)),/Invalid ZIP directory|Invalid ZIP entry/);
const longDirectory=new Uint8Array(source);
new DataView(longDirectory.buffer).setUint32(eocd+12,view.getUint32(eocd+12,true)+1,true);
await assert.rejects(readV47StudentXlsx(asFile(longDirectory)),/Invalid XLSX central directory|Invalid XLSX directory length/);

// Additional independent corruption cases: keep the import preview fail-closed.
const mutate=(position,write)=>{const copy=new Uint8Array(source);write(new DataView(copy.buffer),position,copy);return asFile(copy);};
const rejects=async(position,write,pattern)=>assert.rejects(readV47StudentXlsx(mutate(position,write)),pattern);
// 1-3: ZIP header and directory integrity.
await rejects(0,(_v,p,b)=>{b[p]=0},/Invalid XLSX ZIP/);
await rejects(eocd,(_v,p,b)=>{b[p]=0},/Invalid XLSX central directory/);
await rejects(eocd+8,(v,p)=>v.setUint16(p,0,true),/Invalid XLSX central directory/);
// 4-6: unsupported split archives and directory location.
await rejects(eocd+4,(v,p)=>v.setUint16(p,1,true),/Invalid XLSX central directory/);
await rejects(eocd+6,(v,p)=>v.setUint16(p,1,true),/Invalid XLSX central directory/);
await rejects(eocd+16,(v,p)=>v.setUint32(p,source.length,true),/Invalid XLSX central directory|Unexpected workbook structure/);
// 7-9: worksheet entry boundaries and encryption.
await rejects(central+42,(v,p)=>v.setUint32(p,directory,true),/Invalid ZIP entry/);
await rejects(local+6,(v,p)=>v.setUint16(p,1,true),/Mismatched XLSX ZIP entry/);
await rejects(central+10,(v,p)=>v.setUint16(p,99,true),/Unsupported or oversized Excel entry/);
// 10-12: worksheet size and checksum.
await rejects(central+24,(v,p)=>v.setUint32(p,0,true),/Mismatched XLSX ZIP entry/);
// Both header sizes agree but disagree with actual XML: payload size must fail.
const pairedBadSize=new Uint8Array(source);
const badSizeView=new DataView(pairedBadSize.buffer);
badSizeView.setUint32(central+24,0,true);
badSizeView.setUint32(local+22,0,true);
await assert.rejects(readV47StudentXlsx(asFile(pairedBadSize)),/Invalid XLSX entry size/);
await rejects(central+16,(v,p)=>v.setUint32(p,0xffffffff,true),/Mismatched XLSX ZIP entry/);
await rejects(central+20,(v,p)=>v.setUint32(p,source.length,true),/Truncated XLSX|Mismatched XLSX ZIP entry/);
// 13-15: malformed central record metadata.
await rejects(central+28,(v,p)=>v.setUint16(p,65535,true),/Invalid ZIP entry/);
await rejects(central+30,(v,p)=>v.setUint16(p,65535,true),/Invalid ZIP entry/);
await rejects(central+32,(v,p)=>v.setUint16(p,65535,true),/Invalid ZIP entry/);

// Verify local ZIP entry metadata cannot impersonate a central-directory worksheet.
await rejects(local+30,(_v,p,b)=>{b[p]^=1},/Mismatched XLSX ZIP filename/);
await rejects(local+6,(v,p)=>v.setUint16(p,8,true),/Mismatched XLSX ZIP entry/);
await rejects(local+26,(v,p)=>v.setUint16(p,65535,true),/Invalid ZIP local entry/);
await rejects(local+28,(v,p)=>v.setUint16(p,65535,true),/Invalid ZIP local entry/);
// Verify ZIP local header integrity and strong-encryption rejection.
await rejects(local+14,(v,p)=>v.setUint32(p,0,true),/Mismatched XLSX ZIP entry/);
await rejects(local+18,(v,p)=>v.setUint32(p,0,true),/Mismatched XLSX ZIP entry/);
await rejects(local+22,(v,p)=>v.setUint32(p,0,true),/Mismatched XLSX ZIP entry/);
await rejects(central+8,(v,p)=>v.setUint16(p,0x0840,true),/Unsupported or oversized Excel entry/);
console.log('V47 student XLSX reader ZIP safety regression checks passed');
