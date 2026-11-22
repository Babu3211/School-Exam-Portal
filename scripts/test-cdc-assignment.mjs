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
let nextId=0;
let readSchool;
let denyWrite=false;
const observations=new Map();
const recordData=(path)=>({data:()=>observations.get(path)});

Object.assign(w,{
  auth:{currentUser:{uid:'teacher'}},currentSchoolSettings:{academicYear:'2083'},currentUserRole:current,
  marksStudents:[{...student,id:'one',name:'Test One'},{...student,id:'two',name:'Test Two'},{...student,id:'outside',name:'Outside',section:'B'}],
  isAdmin:()=>false,roleHas:role=>current.roles.includes(role),
  classNoFromName:value=>String(value).match(/\d+/)?.[0],entrySubjectKey:value=>String(value).trim().toLowerCase(),
  ledgerSubjectsForClass:()=>['Mathematics','Computer'],entryClassGroup:()=>'4-5',
  SmssIemisTransfer:{key:value=>String(value).toLowerCase(),subjectKey:value=>String(value).toLowerCase()},
  attendanceAdToBs:v=>v,attendanceBsToAd:v=>v==='2083-13-01'?'invalid':v,attendanceNepalTodayAD:()=>'2083-08-07',
  attendanceDigitsToEnglish:v=>v.replace(/[०-९]/g,d=>String('०१२३४५६७८९'.indexOf(d))),attendancePad:v=>String(v).padStart(2,'0'),
  db:{},
  collection:(_,name)=>name,
  doc:(base,name,id)=>base==='cdc_observations'
    ? {path:base+'/'+(name??++nextId),id:String(name??nextId)} : {path:name+'/'+id},
  getDocFromServer:async ref=>ref.path==='user_roles/teacher'
    ? {data:()=>serverRole} : recordData(ref.path),
  serverTimestamp:()=>({toMillis:()=>nextId}),
  setDoc:async(ref,data)=>{
    assert.match(ref.path,/^cdc_observations\//);
    if(denyWrite||observations.has(ref.path)) throw Error('Permission denied');
    observations.set(ref.path,data);
  },
  where:(...filter)=>filter,
  query:(name,...filters)=>({name,filters}),
  getDocsFromServer:async ({name,filters})=>{
    assert.equal(name,'cdc_observations');
    assert.deepEqual(Object.fromEntries(filters.map(([name,op,value])=>{assert.equal(op,'==');return [name,value];})),{
      studentId:field('student').value,className:field('class').value,subject:field('subject').value,
      section:'A',academicYear:'2083',period:field('period').value
    });
    if(readSchool) await readSchool.promise;
    return {docs:[...observations.keys()].filter(path=>filters.every(([key,,value])=>observations.get(path)[key]===value)).map(recordData)};
  }
});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.eval(html.slice(html.indexOf('const cdcCoreSubjects'),html.indexOf('let iemisEntryGrid'))+'\nopenCdcAssessment();');
const field=name=>w.document.querySelector('[data-cdc="'+name+'"]');
const choice=(name,value)=>{field(name).value=value;field(name).onchange();};
assert.match(field('curriculumSource').href,/moecdc\.gov\.np\/content\/203\//);
field('class').append(new w.Option('Class 1','1'));
choice('class','1');
assert.match(field('curriculumSource').href,/Curriculum_vtgf727\.pdf$/);
choice('class','5');
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
await field('saveSchool').onclick();
assert.match(field('status').textContent,/विद्यालयमा सुरक्षित भयो/);
assert.match(field('schoolRows').textContent,/Synthetic evidence/);
await field('save').onclick();
await field('saveSchool').onclick();
assert.equal(observations.size,1);
assert.match(field('status').textContent,/विद्यालयमा सुरक्षित भयो/);
assert.equal([...observations.values()][0].level,3);
let finishRead;
readSchool={promise:new Promise(resolve=>{finishRead=resolve;})};
const pendingRead=field('readSchool').onclick();
await field('next').onclick();
finishRead();
await pendingRead;
assert.equal(field('schoolRows').rows.length,0);
readSchool=undefined;
assert.equal(field('student').value,'two');assert.equal(field('evidence').value,'');
field('progressRows').querySelector('button').click();
assert.equal(field('evidence').value,'Synthetic evidence');
field('new').click();field('evidence').value='Follow-up';
await field('save').onclick();
assert.equal(field('history').rows.length,2);
await field('saveSchool').onclick();
assert.match(field('status').textContent,/सिकाइ स्तर/);
assert.equal(observations.size,1);
field('level').value='4';
await field('save').onclick();
denyWrite=true;
await field('saveSchool').onclick();
assert.match(field('status').textContent,/पुष्टि भएन/);
assert.equal(observations.size,1);
denyWrite=false;
await field('saveSchool').onclick();
assert.equal(observations.size,2);
assert.match(field('schoolRows').textContent,/Follow-up/);
field('evidence').value='Unsaved changes';
await field('saveSchool').onclick();
assert.match(field('status').textContent,/पहिले/);
assert.equal(observations.size,2);
choice('unit','अर्को एकाइ');
assert.equal(field('unitEn').value,'');
assert.equal(field('evidence').value,'');
choice('unitEn','Geometry');
assert.equal(field('evidence').value,'Follow-up');
const before=JSON.stringify(w.localStorage);
serverRole={...teacher,subjectAssignments:[]};
field('evidence').value='Must not save';await field('save').onclick();
assert.match(field('status').textContent,/तोकिएको छैन/);
assert.equal(JSON.stringify(w.localStorage),before);
current.subjectAssignments=[
  {className:'1',subject:'English'},
  {className:'1',subject:'Nepali'},
  {className:'1',subject:'serophero'}
];
serverRole=current;
w.marksStudents.push({id:'english-student',class:'1',section:'A',name:'Test English'});
w.ledgerSubjectsForClass=()=>['English','Nepali','serophero'];
choice('class','1');
assert.deepEqual([...field('subject').options].map(option=>option.text),['नेपाली','English','हाम्रो सेरोफेरो']);
choice('subject','English');
assert.equal(field('unit').parentElement.hidden,true);
assert.equal(field('topicAlt').parentElement.hidden,true);
choice('unitEn','Alphabet');
const englishOutcome='Copy, recognize and distinguish sounds';
assert.equal(w.document.querySelector('#cdcTopicSuggestions option').value,englishOutcome);
choice('topic',englishOutcome);
assert.equal(field('topic').value,englishOutcome);
field('evidence').value='English evidence';
await field('save').onclick();
assert.match(field('records').selectedOptions[0].text,/Alphabet/);
field('topic').value='';
field('topic').onchange();
choice('topic',englishOutcome);
assert.equal(field('evidence').value,'English evidence');
choice('subject','Nepali');
assert.equal(field('unitEn').parentElement.hidden,true);
choice('subject','serophero');
choice('unit','म र मेरो परिवार');
assert.equal(field('topicAlt').parentElement.hidden,true);
assert.match(w.document.querySelector('#cdcTopicSuggestions option').value,/परिवार/);
for (const [grade, expectedCounts] of [['4',[7,5,4,5,5,4,5,4,4,5,4,4,4,4,5,4]],['5',[7,6,5,6,4,5,4,4,5,4,5,4,5,5,5,4,5]]]) {
  current.subjectAssignments=[{className:grade,subject:'English'}];
  if (![...field('class').options].some(option=>option.value===grade)) field('class').append(new w.Option('Class '+grade,grade));
  choice('class',grade);
  choice('subject','English');
  const units=[...w.document.querySelectorAll('#cdcUnitSuggestions option')].map(option=>option.value);
  assert.equal(units.length,expectedCounts.length);
  units.forEach((unit,index)=>{
    assert.ok(unit.startsWith('Unit '+(index+1)+': '));
    choice('unitEn',unit);
    const outcomes=[...w.document.querySelectorAll('#cdcTopicSuggestions option')].map(option=>option.value);
    assert.equal(outcomes.length,expectedCounts[index]);
    assert.equal(new Set(outcomes).size,outcomes.length);
    assert.deepEqual([...new Set(outcomes.map(text=>text.split(' — ')[0]))],['Listening','Speaking','Reading','Writing']);
    assert.ok(outcomes.every(text=>!/[\u0900-\u097F]/u.test(text)));
  });
}
console.log('CDC English form: all 33 units and 156 indicators for Grades 4 and 5 passed');
for (const grade of ['4','5']) {
  current.subjectAssignments=[{className:grade,subject:'Nepali'}];
  choice('class',grade);
  choice('subject','Nepali');
  assert.equal(field('unitEn').parentElement.hidden,true);
  const units=[...w.document.querySelectorAll('#cdcUnitSuggestions option')].map(option=>option.value);
  assert.equal(units.length,15);
  for (const unit of units) {
    assert.ok(!/[a-z]/i.test(unit));
    choice('unit',unit);
    const outcomes=[...w.document.querySelectorAll('#cdcTopicSuggestions option')].map(option=>option.value);
    assert.deepEqual(outcomes.map(text=>text.split(' — ')[0]),['सुनाइ','बोलाइ','पढाइ','लेखाइ','शब्दभण्डार','भाषिक संरचना']);
    assert.ok(outcomes.every(text=>!/[a-z]/i.test(text)));
  }
  const stories=units.filter(unit=>unit.endsWith('कथा (सामाजिक)'));
  assert.equal(stories.length,2);
  const firstIndicator=unit=>{
    choice('unit',unit);
    return w.document.querySelector('#cdcTopicSuggestions option').value;
  };
  assert.notEqual(firstIndicator(stories[0]),firstIndicator(stories[1]));
}
console.log('CDC Nepali form: all 30 areas and 180 indicators for Grades 4 and 5 passed');
function verifyBilingualUnits(subject, countsByGrade) {
  w.ledgerSubjectsForClass=()=>[subject];
  for (const [grade,counts] of Object.entries(countsByGrade)) {
    current.subjectAssignments=[{className:grade,subject:subject}];
    choice('class',grade);
    choice('subject',subject);
    const units=[...w.document.querySelectorAll('#cdcUnitSuggestions option')].map(option=>option.value);
    assert.equal(units.length,counts.length*2);
    counts.forEach((count,i)=>{
      choice('unitEn',units[2*i+1]);
      assert.equal(field('unit').value,units[2*i]);
      const options=[...w.document.querySelectorAll('#cdcTopicSuggestions option')];
      assert.equal(options.length,2*count);
      assert.equal(new Set(options.map(option=>option.value)).size,2*count);
      assert.ok(options.every(option=>/[अ-ह]/u.test(option.text)&&/[a-z]/i.test(option.text)));
    });
  }
}
verifyBilingualUnits('science', {4:[5,5,3,6,3,14,8,5],5:[6,6,4,3,3,10,13,4]});
verifyBilingualUnits('healthphysicalcreativeart', {4:[5,6,6,10,5,4,10,12,6,7,7,5,3],5:[5,6,6,10,5,4,10,12,6,7,8,6,3]});
w.ledgerSubjectsForClass=()=>['socialstudies'];
for (const [grade,counts] of Object.entries({4:[4,5,5,3,4,5,6],5:[4,5,5,4,3,5,6]})) {
  current.subjectAssignments=[{className:grade,subject:'socialstudies'}];
  choice('class',grade);
  choice('subject','socialstudies');
  assert.equal(field('subject').selectedOptions[0].text,'सामाजिक अध्ययन तथा मानवमूल्य शिक्षा');
  assert.ok(field('unitEn').parentElement.hidden && field('topicAlt').parentElement.hidden);
  const units=[...w.document.querySelectorAll('#cdcUnitSuggestions option')];
  assert.equal(units.length,counts.length);
  units.forEach((unit,i)=>{
    assert.doesNotMatch(unit.text,/[a-z]/i);
    choice('unit',unit.value);
    const topics=[...w.document.querySelectorAll('#cdcTopicSuggestions option')];
    assert.equal(topics.length,counts[i]);
    assert.ok(topics.every(option=>/[अ-ह]/u.test(option.value)&&!/[a-z]/i.test(option.text+option.value)));
  });
}
console.log('Grades 4 and 5: 98 bilingual science and 64 Nepali social studies indicators verified');
// Exercise school saves and reads in every national subject, independently of local drafts.
const upperSubjects=['english','nepali','mathematics','science','socialstudies','healthphysicalcreativeart'];
const lowerSubjects=['english','nepali','mathematics','serophero'];
const grades=['1','2','3','4','5'];
w.ledgerSubjectsForClass=grade=>Number(grade)<=3 ? lowerSubjects : upperSubjects;
current.subjectAssignments=grades.flatMap(className=>w.ledgerSubjectsForClass(className).map(subject=>({className,subject,section:'A'})));
serverRole=current;
for (const grade of grades) {
  if (![...field('class').options].some(option=>option.value===grade)) field('class').append(new w.Option('Class '+grade,grade));
  const first='sample-'+grade, second=first+'-peer';
  w.marksStudents.push(...[first,second].map(id=>({id,class:grade,section:'A',name:id})));
  choice('class',grade);
  for (const subject of w.ledgerSubjectsForClass(grade)) {
    choice('subject',subject);
    choice('student',first);
    choice('period','Final Term');
    const unit=w.document.querySelector('#cdcUnitSuggestions option').value;
    choice(subject==='english'?'unitEn':'unit',unit);
    choice('topic',w.document.querySelector('#cdcTopicSuggestions option').value);
    const levelNames=[...field('level').options].slice(1).map(option=>option.text).join(' ');
    const nepaliOnly=['nepali','socialstudies','serophero'].includes(subject);
    assert.equal(/[अ-ह]/u.test(levelNames),Number(grade)>=4&&subject!=='english');
    assert.equal(/[a-z]/i.test(levelNames),Number(grade)>=4&&!nepaliOnly);
    if (Number(grade)<=3) assert.equal(levelNames,'1 2 3 4');
    const evidence=grade+' '+subject+' sample';
    field('evidence').value=evidence;
    field('level').value='3';
    const count=observations.size;
    await field('save').onclick();
    await field('saveSchool').onclick();
    assert.equal(observations.size,count+1);
    assert.equal([...observations.values()].at(-1).level,3);
    choice('period','Second Term');
    await field('readSchool').onclick();
    assert.equal(field('schoolRows').rows.length,0);
    w.localStorage.clear();
    choice('period','Final Term');
    await field('readSchool').onclick();
    assert.equal(field('schoolRows').rows.length,1);
    const cells=field('schoolRows').rows[0].cells;
    assert.equal(cells[4].textContent,'3');
    assert.equal(cells[5].textContent,evidence);
    if (nepaliOnly) assert.doesNotMatch(cells[0].textContent+cells[1].textContent,/[a-z]/i);
    if (subject==='english') assert.doesNotMatch(cells[0].textContent+cells[1].textContent,/[अ-ह]/u);
    choice('student',second);
    await field('readSchool').onclick();
    assert.equal(field('schoolRows').rows.length,0);
  }
}
console.log('All 24 Grade 1–5 subject selections: rating language, school save, draft-independent read and record isolation passed');
dom.window.close();
console.log('CDC form: bilingual lookup, editable Nepali date, progress, shared save/retry/read, stale results and revoked assignment passed');
