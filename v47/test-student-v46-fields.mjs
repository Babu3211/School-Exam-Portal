import assert from 'node:assert/strict';
import {validateStudent,STUDENT_OPTIONAL_FIELDS} from './student-validation.mjs';
import {STUDENT_EXCEL_HEADERS,studentExcelRow} from './v46-student-excel-schema.mjs';
const sample={name:'Sample Student',class:'9',studentIemisId:'1234567890',fatherName:'Parent',guardianName:'Guardian',dobAD:'2014-01-01',rollNo:'',studentNameNepali:''};
const result=validateStudent(sample);
assert.equal(result.studentIemisId,'1234567890');
assert.equal(result.fatherName,'Parent');
assert.equal(result.guardianName,'Guardian');
assert.equal(result.dobAD,'2014-01-01');
assert.ok(!Object.hasOwn(result,'rollNo'));
assert.ok(!Object.hasOwn(result,'studentNameNepali'));
for(const [field,max] of Object.entries(STUDENT_OPTIONAL_FIELDS)){
 assert.equal(validateStudent({name:'Test Student',class:'ECD',[field]:'x'} )[field],'x');
 assert.throws(()=>validateStudent({name:'Test Student',class:'ECD',[field]:'x'.repeat(max+1)}),RangeError);
}
assert.throws(()=>validateStudent({name:'Test Student',class:'9',fatherName:{unsafe:true}}),TypeError);
assert.throws(()=>validateStudent({name:'Test Student',class:'99'}),RangeError);
const columns=studentExcelRow({...result,schoolId:'12345'});
assert.equal(columns.length,STUDENT_EXCEL_HEADERS.length);
assert.equal(columns[STUDENT_EXCEL_HEADERS.indexOf('Student IEMIS Id')],'1234567890');
assert.equal(columns[STUDENT_EXCEL_HEADERS.indexOf('Father Name')],'Parent');
assert.equal(columns[STUDENT_EXCEL_HEADERS.indexOf('Admission Number')],'');
console.log('V47 student V46 optional-field and Excel mapping validation passed');
