// SMSS multilingual record handling: English controls, Nepali text data allowed.
// Preserve the user's original Unicode text in students, staff and school fields.
const fields=new Set(['studentName','studentNameNepali','fatherName','motherName','guardianName','name','nameEn','school','schoolName','schoolNameNepali','permanentAddress','temporaryAddress','address','subject','remarks']);
export function preserveRecordText(value){
 if(value===null||value===undefined)return '';
 return String(value).normalize('NFC').trim();
}
export function normalizeSearchText(value){
 return preserveRecordText(value).toLocaleLowerCase('en');
}
export function matchesMultilingualSearch(record,query,keys=['studentName','studentNameNepali','name','nameEn','school','permanentAddress','temporaryAddress']){
 const q=normalizeSearchText(query);
 if(!q)return true;
 return keys.some(key=>normalizeSearchText(record?.[key]).includes(q));
}
export function preserveMultilingualRecord(record){
 if(!record||typeof record!=='object'||Array.isArray(record))throw new TypeError('Record object required');
 const copy={...record};
 for(const key of fields){if(Object.prototype.hasOwnProperty.call(copy,key))copy[key]=preserveRecordText(copy[key]);}
 return copy;
}
export const MULTILINGUAL_INPUT_POLICY=Object.freeze({uiLabels:'English',userEnteredData:'English or Nepali Unicode',notices:'Nepali',transliteration:'Never automatic'});
