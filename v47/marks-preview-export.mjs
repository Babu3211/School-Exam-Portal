// Raw mark record export only. Not a calculated ledger or CDC/IEMIS result.
const COLUMNS=['studentId','subjectId','class','term','theory','practical'];
function csvCell(value){
 let text=value==null?'':String(value);
 // Spreadsheet formula injection protection (including leading whitespace).
 if(/^[\s]*[=+@-]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
export function rawMarksCsv(records){
 if(!Array.isArray(records)||records.length>1500)throw new RangeError('Export requires 0–1500 loaded records');
 return [COLUMNS.join(','),...records.map(record=>COLUMNS.map(key=>csvCell(record?.[key])).join(','))].join('\r\n')+'\r\n';
}
