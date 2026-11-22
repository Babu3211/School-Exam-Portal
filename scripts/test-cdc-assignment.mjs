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

const catalogSource = html.slice(html.indexOf('const cdcNormalizeTitle'),html.indexOf('// CDC observations'));
const parseCatalog = new Function(catalogSource+'return parseCdcBilingualCatalog;')();
const bilingual = ['नाप','Measurement','लम्बाइ नाप्ने','Measure length'].join('\t');
assert.deepEqual(parseCatalog(bilingual),[{unit:'नाप',unitEn:'Measurement',ne:'लम्बाइ नाप्ने',en:'Measure length'}]);
assert.throws(()=>parseCatalog(bilingual+'\n'+bilingual),/दोहोरिएको/);
assert.throws(()=>parseCatalog('Measurement\tनाप\tलम्बाइ नाप्ने\tMeasure length'),/क्रम/);
assert.throws(()=>parseCatalog('नाप\tMeasurement'),/चारवटा/);
console.log('CDC bilingual catalog accepts paired titles and rejects malformed or duplicate rows');
const readObservation=new Function(catalogSource+'return cdcStoredObservation;')();
const draftScope=['teacher','2083','5','Math','student','First Term'];
const drafts=new Map();
const storage={getItem:key=>drafts.get(key)??null};
const prefix='smss-cdc-draft:';
drafts.set(prefix+JSON.stringify([...draftScope,'Practice']),JSON.stringify({unit:'Geometry',evidence:'legacy'}));
drafts.set(prefix+JSON.stringify([...draftScope,'Practice','arithmetic']),JSON.stringify({unit:'Arithmetic',evidence:'separate'}));
assert.equal(readObservation(storage,prefix,draftScope,'Practice',' Geometry ').evidence,'legacy');
assert.equal(readObservation(storage,prefix,draftScope,'Practice','Arithmetic').evidence,'separate');
assert.deepEqual(readObservation(storage,prefix,draftScope,'Practice','Statistics'),{});

const {JSDOM}=await import('jsdom');
const dom=new JSDOM('<select id="entryClass"><option>Class 5</option></select>',{url:'https://test.example',runScripts:'outside-only'});
const w=dom.window;
const current={...teacher};
let serverRole=teacher;
Object.assign(w,{
  auth:{currentUser:{uid:'teacher'}},currentSchoolSettings:{academicYear:'2083'},currentUserRole:current,
  marksStudents:[{...student,id:'one',name:'Test One'},{...student,id:'two',name:'Test Two'},{...student,id:'outside',name:'Outside',section:'B'}],
  isAdmin:()=>false,roleHas:role=>current.roles.includes(role),
  classNoFromName:value=>String(value).match(/\d+/)?.[0],entrySubjectKey:value=>String(value).trim().toLowerCase(),
  ledgerSubjectsForClass:()=>['Mathematics','Computer'],entryClassGroup:()=>'4-5',
  SmssIemisTransfer:{key:value=>String(value).toLowerCase(),subjectKey:value=>String(value).toLowerCase()},
  attendanceAdToBs:v=>v,attendanceBsToAd:v=>v==='2083-13-01'?'invalid':v,attendanceNepalTodayAD:()=>'2083-08-07',
  attendanceDigitsToEnglish:v=>v.replace(/[०-९]/g,d=>String('०१२३४५६७८९'.indexOf(d))),attendancePad:v=>String(v).padStart(2,'0'),
  db:{},doc:()=>({}),getDocFromServer:async()=>({data:()=>serverRole})
});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.eval(html.slice(html.indexOf('const cdcCoreSubjects'),html.indexOf('let iemisEntryGrid'))+'\nopenCdcAssessment();');
const field=name=>w.document.querySelector('[data-cdc="'+name+'"]');
const choice=(name,value)=>{field(name).value=value;field(name).onchange();};
assert.deepEqual([...field('student').options].map(o=>o.value),['one','two']);
assert.equal(field('date').value,'2083-08-07');
choice('unitEn','Geometry');
assert.equal(field('unit').value,'ज्यामिति');
choice('topic','Draw perpendicular and parallel lines on a square grid');
assert.match(field('topic').value,/वर्गजाल/);
field('evidence').value='Synthetic evidence';
field('level').value='3';
field('date').value='२०८३-८-२';
await field('save').onclick();
assert.match(field('classProgress').textContent,/1\/2/);
assert.match(field('history').textContent,/2083-08-02/);
await field('next').onclick();
assert.equal(field('student').value,'two');assert.equal(field('evidence').value,'');
field('progressRows').querySelector('button').click();
assert.equal(field('evidence').value,'Synthetic evidence');
field('new').click();field('evidence').value='Follow-up';
await field('save').onclick();
assert.equal(field('history').rows.length,2);
const before=JSON.stringify(w.localStorage);
serverRole={...teacher,subjectAssignments:[]};
field('evidence').value='Must not save';await field('save').onclick();
assert.match(field('status').textContent,/तोकिएको छैन/);
assert.equal(JSON.stringify(w.localStorage),before);
dom.window.close();
console.log('CDC form: bilingual lookup, editable Nepali date, progress, history and revoked assignment passed');
