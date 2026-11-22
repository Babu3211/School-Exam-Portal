// Read XLSX student sheets for preview only; never write records from this module.
const decoder=new TextDecoder('utf-8',{fatal:true});
const u16=(v,i)=>v.getUint16(i,true),u32=(v,i)=>v.getUint32(i,true);
const MAX_FILE=2_000_000,MAX_XML=1_500_000,MAX_ENTRIES=100;
function xml(text){
 if(typeof DOMParser==='undefined')throw new Error('Browser XML parser unavailable');
 const doc=new DOMParser().parseFromString(text,'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw new Error('Invalid workbook XML');
 return doc;
}
function children(node,name){return [...node.childNodes].filter(n=>n.nodeType===1&&n.localName===name);}
function descendants(node,name){return [...node.getElementsByTagName('*')].filter(n=>n.localName===name);}
async function unzip(buffer){
 const view=new DataView(buffer),bytes=new Uint8Array(buffer);
 if(bytes.length<22||u32(view,0)!==0x04034b50)throw new Error('Invalid XLSX ZIP');
 let eocd=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(u32(view,i)===0x06054b50){eocd=i;break;}
 if(eocd<0)throw new Error('Invalid XLSX central directory');
 const count=u16(view,eocd+10),directory=u32(view,eocd+16),directorySize=u32(view,eocd+12);
 if(u16(view,eocd+4)!==0||u16(view,eocd+6)!==0||u16(view,eocd+8)!==count||count===0||directorySize>bytes.length||directory+directorySize>eocd)throw new Error('Invalid XLSX central directory');
 if(count>MAX_ENTRIES||directory>=bytes.length)throw new Error('Unexpected workbook structure');
 const files=new Map();let offset=directory;
 for(let i=0;i<count;i++){
  if(offset+46>bytes.length||u32(view,offset)!==0x02014b50)throw new Error('Invalid ZIP directory');
  const flags=u16(view,offset+8),method=u16(view,offset+10),compressed=u32(view,offset+20),uncompressed=u32(view,offset+24);
  const nameLength=u16(view,offset+28),extra=u16(view,offset+30),comment=u16(view,offset+32),local=u32(view,offset+42);
  if(offset+46+nameLength+extra+comment>bytes.length||local+30>bytes.length||u32(view,local)!==0x04034b50)throw new Error('Invalid ZIP entry');
  const name=decoder.decode(bytes.subarray(offset+46,offset+46+nameLength));
  offset+=46+nameLength+extra+comment;
  if(!['xl/worksheets/sheet1.xml','xl/sharedStrings.xml'].includes(name))continue;
  if((flags&1)||![0,8].includes(method)||uncompressed>MAX_XML)throw new Error('Unsupported or oversized Excel entry');
  if(u16(view,local+8)!==method||u16(view,local+6)&1)throw new Error('Mismatched XLSX ZIP entry');
  const start=local+30+u16(view,local+26)+u16(view,local+28);
  if(start+compressed>directory||start+compressed>bytes.length)throw new Error('Truncated XLSX');
  let output;
  if(method===0)output=bytes.subarray(start,start+compressed);
  else {
   if(typeof DecompressionStream==='undefined')throw new Error('Compressed XLSX requires browser decompression support');
   const stream=new Blob([bytes.slice(start,start+compressed)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   const reader=stream.getReader(),parts=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_XML){await reader.cancel();throw new RangeError('Excel worksheet too large');}parts.push(value);}}
   finally{reader.releaseLock();}
   output=new Uint8Array(size);let pos=0;for(const part of parts){output.set(part,pos);pos+=part.length;}
  }
  if(output.length!==uncompressed)throw new Error('Invalid XLSX entry size');
  files.set(name,decoder.decode(output));
 }
 return files;
}
export async function readV47StudentXlsx(file){
 if(!file||typeof file.arrayBuffer!=='function'||!Number.isFinite(file.size)||file.size>MAX_FILE)throw new RangeError('Excel file must be 2 MB or smaller');
 const files=await unzip(await file.arrayBuffer()),sheet=files.get('xl/worksheets/sheet1.xml');
 if(!sheet)throw new Error('Missing worksheet');
 const shared=files.get('xl/sharedStrings.xml');
 const strings=shared?descendants(xml(shared),'si').map(si=>descendants(si,'t').map(t=>t.textContent??'').join('')):[];
 const rows=[];
 for(const row of descendants(xml(sheet),'row')){
  if(rows.length>=1501)throw new RangeError('Maximum 1500 student rows per preview');
  const cells=[];let previous=0;
  for(const cell of children(row,'c')){
   const ref=cell.getAttribute('r')??'',letters=/^[A-Z]+/.exec(ref)?.[0];
   if(!letters)throw new Error('Invalid Excel cell reference');
   let index=0;for(const ch of letters)index=index*26+ch.charCodeAt(0)-64;
   if(index<1||index>26||index<=previous)throw new Error('Unexpected Excel column');
   while(cells.length<index-1)cells.push('');
   if(children(cell,'f').length)throw new Error('Formula cells are not supported');
   const kind=cell.getAttribute('t'),raw=children(cell,'v')[0]?.textContent??'';
   let value;
   if(kind==='inlineStr')value=descendants(cell,'t').map(t=>t.textContent??'').join('');
   else if(kind==='s'){const n=Number(raw);if(!Number.isSafeInteger(n)||n<0||n>=strings.length)throw new Error('Invalid shared string');value=strings[n];}
   else if(kind===null||kind==='n'||kind==='str')value=raw;
   else throw new Error('Unsupported Excel cell type');
   cells.push(value);previous=index;
  }
  while(cells.length<26)cells.push('');
  rows.push(cells);
 }
 if(!rows.length)throw new Error('Empty Excel sheet');
 return rows;
}
