// Convert a bounded, first-worksheet XLSX table to V46/IEMIS import-preview rows.
// This is read-only. No Firebase or third-party spreadsheet scripts.
import {validateV46IemisExcelHeaders} from './v46-iemis-student-import-preview.mjs';
export function rowsFromV46IemisXlsxTable(table){
 if(!Array.isArray(table)||table.length<2||table.length>1501)throw new RangeError('Excel मा १ देखि १५०० विद्यार्थी आवश्यक छन्।');
 const header=table[0];
 if(!Array.isArray(header)||header.length>26||header.some(v=>typeof v!=='string'))
  throw new TypeError('Excel Column शीर्षक ठीक छैनन्।');
 const headings=header.map(value=>value.trim());
 const used=headings.filter(Boolean);
 if(used.length!==new Set(used).size)throw new Error('Excel Column दोहोरिएको छ।');
 const rows=[];
 for(const cells of table.slice(1)){
  if(!Array.isArray(cells)||cells.length>26||cells.some(value=>typeof value!=='string'))
   throw new Error('Excel मा अमान्य विद्यार्थी विवरण भेटियो।');
  if(cells.every(value=>!value.trim()))continue;
  const row={};
  for(let i=0;i<headings.length;i++)if(headings[i])row[headings[i]]=cells[i]??'';
  rows.push(row);
 }
 if(!rows.length||rows.length>1500)throw new RangeError('Excel मा १ देखि १५०० विद्यार्थी आवश्यक छन्।');
 validateV46IemisExcelHeaders(rows);
 return rows;
}
