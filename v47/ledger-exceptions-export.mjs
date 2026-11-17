// Read-only CSV of diagnostic exceptions; never an official CDC/IEMIS result export.
const csvCell=value=>{const raw=String(value??'');const safe=/^[\t\r\n ]*[=+@-]/.test(raw)?"'"+raw:raw;return '"'+safe.replace(/"/g,'""')+'"';};
export function ledgerExceptionsCsv(preview){
 if(!preview||preview.officialLedger!==false||preview.publishable!==false||!Array.isArray(preview.invalidOrMissingDetails)||!preview.summary)throw new TypeError('Non-publishable V47 raw ledger preview required');
 const headers=['Class','Term','Student ID','Student Name','Subject ID','Subject Name','Issue'];
 const lines=[headers.map(csvCell).join(',')];
 for(const entry of preview.invalidOrMissingDetails){
  if(!entry||!['missing_mark','invalid_score_or_format'].includes(entry.reason))throw new Error('Invalid exception row');
  lines.push([preview.schoolClass,preview.term,entry.studentId,entry.studentName,entry.subjectId,entry.subjectName,entry.reason].map(csvCell).join(','));
 }
 return lines.join('\r\n')+'\r\n';
}
