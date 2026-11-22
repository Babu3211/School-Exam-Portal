// Exact V46 staff Excel format, preserved for V47 multi-school read-only export.
// Keep columns, labels and order identical to the verified V46 source.
export const V46_STAFF_EXCEL_HEADERS=Object.freeze(['Employee ID','नाम, थर (नेपाली)','Name (English)','स्थायी ठेगाना','तह/श्रेणी','नियुक्ति मिति (वि.सं.)','नियुक्ति प्रकार','शैक्षिक योग्यता','विषय','सम्पर्क नं.','Status']);
export function v46StaffExcelRow(x){
 if(!x||typeof x!=='object'||Array.isArray(x))throw new TypeError('Staff record required');

 // V46 had separate Nepali 'name' and English 'nameEn'. New V47
 // School Admin staff creation stores English 'name' plus 'position'.
 // Keep the exported V46 column order; never put English in the Nepali column.
 const v47Style=Object.hasOwn(x,'position')||Object.hasOwn(x,'nameEnglish')||Object.hasOwn(x,'nameNepali');
 const nepali=x.nameNepali||(!v47Style?x.name:'')||'';
 const english=x.nameEn||x.nameEnglish||(v47Style?x.name:'')||'';
 return [x.staffId||'',nepali,english,x.permanentAddress||'',x.levelCategory||x.role||x.position||'',x.appointmentDateBs||'',x.appointmentType||'',x.qualification||'',x.subject||'',x.phone||'',x.status||'कार्यरत'];
}
export function schoolScopedV46StaffExcel(records,schoolId){
 if(typeof schoolId!=='string'||!/^[A-Za-z0-9_-]{3,64}$/.test(schoolId))throw new Error('Valid school ID required');
 if(!Array.isArray(records))throw new TypeError('Staff records required');
 for(const record of records)if(!record||record.schoolId!==schoolId)throw new Error('Cross-school staff record rejected');
 return Object.freeze({headers:V46_STAFF_EXCEL_HEADERS,rows:records.map(v46StaffExcelRow)});
}
