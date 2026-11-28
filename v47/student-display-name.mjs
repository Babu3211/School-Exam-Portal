// Consistent display and Excel identity for a verified student record.
// The canonical document ID remains the authoritative identifier.
export function studentDisplayName(student){
 for(const key of ['nameEnglish','name','nameEn','nameNepali']){
  const value=student?.[key];
  if(typeof value==='string'&&value.trim())return value.trim();
 }
 return String(student?.id??'');
}
