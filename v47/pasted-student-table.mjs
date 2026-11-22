// Parse pasted Excel cells without changing cell contents or dropping empty trailing columns.
export function parsePastedStudentTable(text){
 if(typeof text!=='string'||text.length>1500000)throw new RangeError('Invalid spreadsheet paste size');
 const normalized=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').replace(/\n+$/,'');
 if(!normalized.trim())throw new Error('Paste the V46 header and student rows');
 const lines=normalized.split('\n');
 if(lines.length>1501)throw new RangeError('Maximum 1500 student rows per preview');
 return lines.map(line=>line.split('\t'));
}
