import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
// Browser-side XLSX import for SMSS templates edited in Excel or LibreOffice.
// Supports ZIP stored and deflated entries; never executes workbook formulas.
export async function readSmssMarksExcel(file,{settings,schoolId,classId,subjectId,examId,students}){
 if(!file||!(/\.xlsx$/i.test(file.name??''))||file.size>4_000_000)throw new Error('Select a valid Excel .xlsx file (maximum 4 MB)');
 const bytes=new Uint8Array(await file.arrayBuffer()),decoder=new TextDecoder('utf-8',{fatal:true});
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const parts=new Map();let offset=0;
 while(offset+4<=bytes.length&&view.getUint32(offset,true)===0x04034b50){
  if(offset+30>bytes.length)throw new Error('Truncated Excel ZIP');
  const flags=view.getUint16(offset+6,true),method=view.getUint16(offset+8,true),size=view.getUint32(offset+18,true),uncompressed=view.getUint32(offset+22,true);
  const nameSize=view.getUint16(offset+26,true),extraSize=view.getUint16(offset+28,true);
  const start=offset+30+nameSize+extraSize,end=start+size;
  if(flags&9||![0,8].includes(method)||end>bytes.length||uncompressed>8_000_000)throw new Error('Unsupported, encrypted or oversized Excel workbook');
  const name=decoder.decode(bytes.slice(offset+30,offset+30+nameSize));
  if(parts.has(name)||parts.size>128)throw new Error('Invalid Excel workbook contents');
  if(!/^(?:xl\/(?:worksheets\/sheet1\.xml|workbook\.xml|sharedStrings\.xml)|\[Content_Types\]\.xml|_rels\/\.rels|xl\/_rels\/workbook\.xml\.rels)$/.test(name)){
   offset=end;continue;
  }
  let payload=bytes.slice(start,end);
  if(method===8){
   if(typeof DecompressionStream!=='function')throw new Error('This browser cannot read compressed Excel files');
   const stream=new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   const result=await new Response(stream).arrayBuffer();
   payload=new Uint8Array(result);
  }
  if(payload.length!==uncompressed)throw new Error('Excel ZIP entry length mismatch');
  parts.set(name,decoder.decode(payload));offset=end;
 }
 if(offset+4>bytes.length||view.getUint32(offset,true)!==0x02014b50)throw new Error('Incomplete Excel ZIP directory');
 const sheet=parts.get('xl/worksheets/sheet1.xml');
 if(!sheet||!parts.has('xl/workbook.xml'))throw new Error('Not an SMSS Excel sample workbook');
 const parseXml=source=>{const doc=new DOMParser().parseFromString(source,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('Invalid Excel XML');return doc};
 const xml=parseXml(sheet);
 const shared=parts.has('xl/sharedStrings.xml')?[...parseXml(parts.get('xl/sharedStrings.xml')).getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(t=>t.textContent??'').join('')):[];
 const parsed=[...xml.getElementsByTagName('row')].map((row,rowIndex)=>{
  const values=[],rowNumber=Number(row.getAttribute('r'));
  if(!Number.isInteger(rowNumber)||rowNumber!==rowIndex+1||rowNumber>1501)throw new Error('Missing or reordered Excel row');
  for(const cell of row.getElementsByTagName('c')){
   const ref=cell.getAttribute('r')??'',match=/^([A-Z]{1,3})([0-9]+)$/.exec(ref);
   if(!match||Number(match[2])!==rowNumber)throw new Error('Invalid Excel cell reference');
   let index=0;for(const letter of match[1])index=index*26+letter.charCodeAt(0)-64;index--;
   if(index<0||index>52||Object.hasOwn(values,index))throw new Error('Duplicate or excessive Excel column');
   if(cell.getElementsByTagName('f').length)throw new Error('Excel formulas are not permitted in marks import');
   const type=cell.getAttribute('t');
   if(type==='inlineStr')values[index]=[...cell.getElementsByTagName('t')].map(t=>t.textContent??'').join('');
   else if(type==='s'){const n=Number(cell.getElementsByTagName('v')[0]?.textContent);if(!Number.isInteger(n)||n<0||n>=shared.length)throw new Error('Invalid shared Excel string');values[index]=shared[n]}
   else if(type==='str'||type===null||type==='n')values[index]=cell.getElementsByTagName('v')[0]?.textContent??'';
   else throw new Error('Unsupported Excel cell type');
  }
  return values;
 });
 if(!parsed.length||parsed.length>1501)throw new Error('Excel roster must contain 1–1500 students');
 const components=settings?.components;
 if(settings?.schoolId!==schoolId||String(settings?.classId)!==classId||settings?.subjectId!==subjectId||settings?.examId!==examId||settings?.active!==true||!Array.isArray(components))throw new Error('Verified Examination Settings required');
 const headers=['Student ID','Student Name','Absent (Yes/No)',...components.map(c=>c.name+' (max '+c.fullMarks+')')];
 if(parsed[0].length!==headers.length||headers.some((h,i)=>parsed[0][i]!==h))throw new Error('Excel columns differ from current Examination Settings');
 if(!Array.isArray(students)||students.length!==parsed.length-1||students.some(s=>!isActiveEnrolledStudent(s)))throw new Error('Excel roster differs from current class');
 const roster=new Map(students.map(s=>[s.id,String(s.name??s.id)])),seen=new Set(),drafts=[];
 if(roster.size!==students.length)throw new Error('Duplicate student in authoritative roster');
 for(const row of parsed.slice(1)){
  if(row.length>headers.length||!roster.has(row[0])||seen.has(row[0]))throw new Error('Unknown, duplicate or incomplete student in Excel');
  if(row[1]!==roster.get(row[0]))throw new Error('Student name does not match current school roster for '+row[0]);
  seen.add(row[0]);const flag=String(row[2]).trim().toLowerCase();
  if(!['yes','no'].includes(flag))throw new Error('Absent column must be Yes or No');
  const absent=flag==='yes',values={};
  components.forEach((c,i)=>{values[c.key]=row[i+3]??''});
  if(!absent){for(const c of components){const v=String(values[c.key]).trim();if(!/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/.test(v)||Number(v)>c.fullMarks)throw new Error('Missing or invalid '+c.name+' marks for '+row[0]);values[c.key]=v}}
  if(absent&&Object.values(values).some(v=>String(v).trim()!==''))throw new Error('Absent student cannot have marks');
  drafts.push({studentId:row[0],isAbsent:absent,values:absent?{}:values});
 }
 return drafts;
}
