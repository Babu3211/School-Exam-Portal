import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STUDENT_EXCEL_HEADERS,studentExcelRow} from './v46-student-excel-schema.mjs';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const match=source.match(/const studentExcelHeaders=(\[[^;]+\]);/);
assert.ok(match,'V46 source schema must exist');
const preserved=JSON.parse(match[1].replace(/'/g,'"'));
assert.deepEqual(STUDENT_EXCEL_HEADERS,preserved,'V47 student Excel columns must exactly match V46');
assert.equal(STUDENT_EXCEL_HEADERS.length,26);
const row=studentExcelRow({rollNo:'001',studentName:'Test Student',class:'9',studentIemisNo:'0000123',phone:'9800000000'});
assert.equal(row.length,26);
assert.equal(row[0],'001');
assert.equal(row[3],'0000123');
assert.equal(row[4],'Test Student');
const bilingual=studentExcelRow({
 schoolId:'300160003',class:'1',studentIemisNo:'00000009',
 studentName:'पुरानो नेपाली',nameEnglish:'English Student',
 studentNameNepali:'नेपाली विद्यार्थी',name:'Fallback English'
});
assert.equal(bilingual[1],'300160003','IEMIS school ID must not be changed');
assert.equal(bilingual[3],'00000009','Leading zeros in Student IEMIS ID must survive');
assert.equal(bilingual[4],'English Student','English Name must take precedence');
assert.equal(bilingual[5],'नेपाली विद्यार्थी','Optional Nepali Name must be separate');
const modern=studentExcelRow({schoolId:'300160003',class:'11',
 nameEnglish:'Modern Student',nameNepali:'आधुनिक विद्यार्थी'});
assert.equal(modern[4],'Modern Student','Modern English-only record must export');
assert.equal(modern[5],'आधुनिक विद्यार्थी');
const englishOnly=studentExcelRow({schoolId:'300160003',class:'ECD',name:'English Only'});
assert.equal(englishOnly[4],'English Only');
assert.equal(englishOnly[5],'');
const legacy=studentExcelRow({studentName:'Legacy Name',class:'9'});
assert.equal(legacy[4],'Legacy Name','Do not break V46 existing student exports');
assert.equal(modern.length,26,'Preserve exact V46 Excel columns');

assert.equal(row[9],'9');
assert.equal(row[20],'9800000000');
const ui=readFileSync(new URL('students-console.mjs',import.meta.url),'utf8');
assert.match(ui,/records\.map\(studentExcelRow\)/);
assert.match(ui,/STUDENT_EXCEL_HEADERS\.map\(\(\)=> ''\)/);
console.log('V46/V47 student Excel 26-column exact schema parity passed');
