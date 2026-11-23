import assert from 'node:assert/strict';
import {V46_STUDENT_FIELDS,projectV46StudentRecord} from './v46-student-record-compat.mjs';
import {readFileSync} from 'node:fs';
const v46=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const exportFunction=v46.slice(v46.indexOf('function studentToExportRow('),v46.indexOf('const staffExcelHeaders=',v46.indexOf('function studentToExportRow('))>0?v46.indexOf('const staffExcelHeaders=',v46.indexOf('function studentToExportRow(')):v46.indexOf('function studentToExportRow(')+2200);
for(const field of ['studentName','studentIemisNo','fatherName','motherName','guardianName','admissionNo','permanentAddress','birthRegistrationNo','nebRegNo','symbolNo','dobAD']){
 assert.ok(V46_STUDENT_FIELDS.includes(field),'missing original V46 field '+field);
 assert.ok(v46.includes('x.'+field),'V46 source does not contain expected export field '+field);
}
const original={schoolId:'school_A',studentName:'Example',studentIemisNo:'001234',admissionNo:'0001',sourceClass:'Class 1',class:'1',guardianName:'Parent',phone:'9800000000'};
const projected=projectV46StudentRecord(original,{schoolId:'school_A'});
assert.equal(projected.studentIemisNo,'001234');
const modern={
 schoolId:'school_A',id:'st007',class:'9',nameEnglish:'Modern English Student',
 nameNepali:'नेपाली नाम',studentIemisNo:'0000009',admissionNo:'001',active:true
};
const modernProjected=projectV46StudentRecord(modern,{schoolId:'school_A'});
assert.equal(modernProjected.nameEnglish,'Modern English Student');
assert.equal(modernProjected.id,'st007','Preserve document identity for read-only ledgers');
assert.equal(modernProjected.nameNepali,'नेपाली नाम');
assert.equal(modernProjected.studentIemisNo,'0000009');
assert.equal(modernProjected.schoolId,'school_A');
assert.equal(modernProjected.name,undefined);
const legacyBilingual=projectV46StudentRecord({
 schoolId:'school_A',studentName:'Original V46',studentNameEnglish:'English First',
 studentNameNepali:'नेपाली',class:'1'
},{schoolId:'school_A'});
assert.equal(legacyBilingual.studentName,'Original V46');
assert.equal(legacyBilingual.studentNameEnglish,'English First');
assert.equal(legacyBilingual.studentNameNepali,'नेपाली');
assert.equal(modern.nameEnglish,'Modern English Student','Source record must never be altered');
assert.equal(projected.admissionNo,'0001');assert.equal(projected.sourceClass,'Class 1');
assert.throws(()=>projectV46StudentRecord(original,{schoolId:'school_B'}),/Cross-school/);
assert.throws(()=>projectV46StudentRecord(original,{schoolId:''}),/Valid school/);
console.log('PASS: V46 student field compatibility and cross-school rejection (pure test)');
