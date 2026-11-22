// Read V47-generated, uncompressed XLSX files for safe student import preview.
// Other XLSX compression types are explicitly rejected, not silently misread.
const decoder=new TextDecoder('utf-8',{fatal:true});
const u16=(v,i)=>v.getUint16(i,true),u32=(v,i)=>v.getUint32(i,true);
export async function readV47StudentXlsx(file){
 if(!file||typeof file.arrayBuffer!=='function'||file.size>2000000)throw new RangeError('Excel file must be 2 MB or smaller');
 const buffer=await file.arrayBuffer(),view=new DataView(buffer),bytes=new Uint8Array(buffer);
 if(bytes.length<30||u32(view,0)!==0x04034b50)throw new Error('Invalid XLSX ZIP');
 let offset=0,sheet=null,entries=0;
 while(offset+30<=bytes.length&&u32(view,offset)===0x04034b50){
  if(++entries>30)throw new Error('Unexpected workbook structure');
  const flags=u16(view,offset+6),method=u16(view,offset+8),length=u32(view,offset+18),nameLength=u16(view,offset+26),extraLength=u16(view,offset+28);
  if(flags&8||method!==0)throw new Error('Compressed Excel files are not supported by this preview. Use Excel copy/paste.');
  const nameStart=offset+30,dataStart=nameStart+nameLength+extraLength,end=dataStart+length;
  if(end>bytes.length)throw new Error('Truncated XLSX');
  const name=decoder.decode(bytes.subarray(nameStart,nameStart+nameLength));
  if(name==='xl/worksheets/sheet1.xml')sheet=decoder.decode(bytes.subarray(dataStart,end));
  offset=end;
 }
 if(!sheet||sheet.length>1500000)throw new Error('Missing or oversized worksheet');
 if(typeof DOMParser==='undefined')throw new Error('Browser XML parser unavailable');
 const doc=new DOMParser().parseFromString(sheet,'application/xml');
 if(doc.querySelector('parsererror'))throw new Error('Invalid worksheet XML');
 const rows=[];
 for(const row of doc.getElementsByTagName('row')){
  if(rows.length>1500)throw new RangeError('Maximum 1500 student rows per preview');
  const cells=[];let previous=0;
  for(const cell of row.getElementsByTagName('c')){
   const ref=cell.getAttribute('r')??'',letters=/^[A-Z]+/.exec(ref)?.[0];
   if(!letters)throw new Error('Invalid Excel cell reference');
   let index=0;for(const ch of letters)index=index*26+ch.charCodeAt(0)-64;
   if(index<1||index>26||index<=previous)throw new Error('Unexpected Excel column');
   while(cells.length<index-1)cells.push('');
   const kind=cell.getAttribute('t');
   if(kind==='f'||cell.getElementsByTagName('f').length)throw new Error('Formula cells are not supported');
   if(kind!=='inlineStr'&&kind!=='n'&&kind!==null)throw new Error('Unsupported Excel cell type');
   const value=kind==='inlineStr'?cell.getElementsByTagName('t')[0]?.textContent??'':cell.getElementsByTagName('v')[0]?.textContent??'';
   cells.push(value);previous=index;
  }
  while(cells.length<26)cells.push('');
  rows.push(cells);
 }
 if(!rows.length)throw new Error('Empty Excel sheet');
 return rows;
}
