import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync('index.html','utf8');
const source = html.slice(html.indexOf('function cdcTeacherAssignment'),html.indexOf('// CDC observations'));
const allowed = new Function('classNoFromName','entrySubjectKey',source+'return cdcTeacherAssignment;')(
  value=>String(value).match(/\d+/)?.[0], value=>String(value).trim().toLowerCase());
const task = {className:'Class 5',subject:'Mathematics',section:'A'};
const teacher = {active:true,roles:['subject_teacher'],subjectAssignments:[task]};
const student = {class:'5',section:'A',active:true};
assert.equal(allowed(teacher,'5','Mathematics',student),true);
assert.equal(allowed(teacher,'5','Mathematics',{...student,section:'B'}),false);
assert.equal(allowed(teacher,'5','English',student),false);
assert.equal(allowed(teacher,'4','Mathematics',student),false);
assert.equal(allowed({...teacher,active:false},'5','Mathematics',student),false);
assert.equal(allowed({...teacher,roles:['subject_teacher','viewer']},'5','Mathematics',student),false);
assert.equal(allowed({...teacher,subjectAssignments:[]},'5','Mathematics',student),false);
assert.equal(allowed({...teacher,subjectAssignments:[{...task,section:'ALL'}]},'5','Mathematics',{...student,section:'B'}),true);
console.log('CDC teacher assignment and section checks passed');

const catalogSource = html.slice(html.indexOf('function parseCdcBilingualCatalog'),html.indexOf('// CDC observations'));
const parseCatalog = new Function(catalogSource+'return parseCdcBilingualCatalog;')();
const bilingual = ['नाप','Measurement','लम्बाइ नाप्ने','Measure length'].join('\t');
assert.deepEqual(parseCatalog(bilingual),[{unit:'नाप',unitEn:'Measurement',ne:'लम्बाइ नाप्ने',en:'Measure length'}]);
assert.throws(()=>parseCatalog(bilingual+'\n'+bilingual),/दोहोरिएको/);
assert.throws(()=>parseCatalog('Measurement\tनाप\tलम्बाइ नाप्ने\tMeasure length'),/क्रम/);
assert.throws(()=>parseCatalog('नाप\tMeasurement'),/चारवटा/);
console.log('CDC bilingual catalog accepts paired titles and rejects malformed or duplicate rows');
