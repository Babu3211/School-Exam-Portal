// Dependency-free Office Open XML writer. Produces a real .xlsx ZIP workbook, not renamed CSV.
const enc=new TextEncoder();
const xml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const col=n=>{let s='';for(let x=n+1;x;x=Math.floor((x-1)/26))s=String.fromCharCode(65+(x-1)%26)+s;return s};
const u16=(a,n)=>{a.push(n&255,(n>>>8)&255)};
const u32=(a,n)=>{a.push(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255)};
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0};
export function officeZip(files,type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){
 const chunks=[],central=[];let offset=0;
 for(const [name,body] of files){
  const n=enc.encode(name),data=enc.encode(body),crc=crc32(data),h=[];
  u32(h,0x04034b50);u16(h,20);u16(h,0x0800);u16(h,0);u16(h,0);u16(h,0);u32(h,crc);u32(h,data.length);u32(h,data.length);u16(h,n.length);u16(h,0);
  chunks.push(Uint8Array.from(h),n,data);
  const c=[];u32(c,0x02014b50);u16(c,20);u16(c,20);u16(c,0x0800);u16(c,0);u16(c,0);u16(c,0);u32(c,crc);u32(c,data.length);u32(c,data.length);u16(c,n.length);u16(c,0);u16(c,0);u16(c,0);u16(c,0);u32(c,0);u32(c,offset);
  central.push(Uint8Array.from(c),n);offset+=h.length+n.length+data.length;
 }
 const centralSize=central.reduce((n,c)=>n+c.length,0),end=[];u32(end,0x06054b50);u16(end,0);u16(end,0);u16(end,files.length);u16(end,files.length);u32(end,centralSize);u32(end,offset);u16(end,0);
 return new Blob([...chunks,...central,Uint8Array.from(end)],{type});
}
export function excelWorkbook(headers,rows,{sheetName='Records'}={}){
 if(!Array.isArray(headers)||!headers.length||headers.length>100||!Array.isArray(rows)||rows.length>50000)throw new RangeError('Invalid Excel table dimensions');
 if(rows.some(row=>!Array.isArray(row)||row.length!==headers.length))throw new TypeError('Excel row column mismatch');
 const safeName=String(sheetName).replace(/[\\/*?:\[\]]/g,'').slice(0,31)||'Records';
 const cells=[headers,...rows].map((row,i)=>'<row r="'+(i+1)+'">'+row.map((value,j)=>{
  const ref=col(j)+(i+1);
  if(typeof value==='number'&&Number.isFinite(value))return '<c r="'+ref+'"><v>'+value+'</v></c>';
  // Text is stored as inlineStr; user-provided formulas cannot execute.
  const v=String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  return '<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>';
 }).join('')+'</row>').join('');
 const sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+cells+'</sheetData></worksheet>';
 const workbook='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+xml(safeName)+'" sheetId="1" r:id="rId1"/></sheets></workbook>';
 return officeZip([
  ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
  ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
  ['xl/workbook.xml',workbook],
  ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
  ['xl/worksheets/sheet1.xml',sheet]
 ]);
}
