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
      studentId:field('student').value,className:({three:'Class 3',primary:'Class 5','nepali-1':'Class 1','nepali-2':'Class 2','nepali-3':'Class 3','english-1':'Class 1','english-2':'Class 2','english-3':'Class 3'})[field('student').value]||field('class').value,subject:field('subject').value,
      section:'A',academicYear:w.currentSchoolSettings.academicYear,...(filters.some(([key])=>key==='period')?{period:field('period').value}:{})
    });
    if(readSchool) await readSchool.promise;
    return {docs:[...observations.keys()].filter(path=>filters.every(([key,,value])=>observations.get(path)[key]===value)).map(recordData)};
  }
});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.eval(readFileSync('iemis-importer/transfer.js','utf8'));
// Capture the lexical catalogue in the same eval that initializes the page.
const legacyForms=w.eval(html.slice(html.indexOf('const cdcCoreSubjects'),html.indexOf('let iemisEntryGrid'))+'\nwindow.__testSeroApproved=cdcSeroGuideApproved;\nwindow.__testSeroEntryForm=cdcSeroGuideEntryForm;\nopenCdcAssessment();\ncdcLegacyMathRubrics;');
const field=name=>w.document.querySelector('[data-cdc="'+name+'"]');
const choice=(name,value)=>{field(name).value=value;field(name).onchange();};
const references=field('referenceLibrary');
assert.ok(references);
for(const name of ['guidePdf13','guidePdf45','guideOfficial13','guideOfficial45','guideCurriculum13','guideCurriculumMirror13','guideMirror45','guideCehrd45','guideHealth4','guideHealth5']){
 const link=field(name);
 assert.ok(references.contains(link),name);
 assert.equal(link.target,'_blank');
 assert.ok(link.rel.split(' ').includes('noopener'));
 assert.equal(new URL(link.href).protocol,'https:');
}
assert.equal(field('guidePdf13').href,'https://hemantaparajuli.com.np/wp-content/uploads/2025/08/'+encodeURIComponent('विद्यार्थी-मूल्याङ्‍कन-मार्गदर्शन-१-३')+'.pdf');
assert.match(field('guidePdf45').href,/^https:\/\/learning\.cehrd\.gov\.np\/pluginfile\.php\/106343\//);
assert.match(field('guideOfficial13').href,/\/644\//);
assert.match(field('guideOfficial45').href,/\/646\//);
assert.equal(field('guideCehrd45').href,'https://learning.cehrd.gov.np/mod/resource/view.php?id=1032');
for(const [name,page] of [['guideHealth4',123],['guideHealth5',136]]){
 const link=new URL(field(name).href);
 assert.equal(link.hash,'#page='+page);
 link.hash='';
 assert.equal(link.href,field('guidePdf45').href);
}
console.log('Both CDC assessment guide reference PDFs and official source links visible together');

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
    const picker=field('outcomePicker');
    assert.equal(field('outcomePickerLabel').hidden,false);
    assert.match(field('guide').textContent,Number(grade)<=3 ? /२०७६/ : /२०८३/);
    choice('outcomePicker',picker.options[1].value);
    assert.equal(picker.selectedIndex,1);
    assert.ok(field('topic').value.trim());
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
// The registry spelling is the Firestore subject key; localize only the menu label.
for (const [grade,registered,label] of [
  ['1','Our Surroundings','हाम्रो सेरोफेरो'],['2','हाम्रो सेरोफेरो','हाम्रो सेरोफेरो'],
  ['3','Nepali (1021)','नेपाली'],['4','English (1011)','English'],
  ['5','सामाजिक अध्ययन','सामाजिक अध्ययन तथा मानवमूल्य शिक्षा'],
  ['5','Social Studies and Human Values Education','सामाजिक अध्ययन तथा मानवमूल्य शिक्षा'],
  ['5','Science & Technology','विज्ञान तथा प्रविधि / Science and Technology'],
  ...['स्थानीय विषय','मातृभाषा','स्थानीय','मातृभाषा वा स्थानीय विषय','Local Subject',
      'Mother Tongue or Local Subject','Our Dhunibesi'].map(name=>['4',name,'मातृभाषा वा स्थानीय विषय / Mother Tongue or Local Subject'])
]) {
  w.ledgerSubjectsForClass=()=>[registered];
  current.subjectAssignments=[{className:grade,subject:registered,section:'A'}];
  choice('class',grade);
  assert.deepEqual([...field('subject').options].map(option=>[option.value,option.text]),[[registered,label]]);
  if (label==='हाम्रो सेरोफेरो') {
    choice('unit','म र मेरो परिवार');
    const topic=w.document.querySelector('#cdcTopicSuggestions option');
    assert.ok(topic && /[अ-ह]/u.test(topic.value) && !/[a-z]/i.test(topic.text));
  }
}
console.log('Real registry spellings, local subjects and IEMIS-coded subject labels passed');
// Standalone assessment route is a sibling of Marks Entry and requires no marks or exams.
assert.match(html,/<summary>[^\n]*Manage Exam<\/summary>[^\n]*data-page="cdc-assessment"/);
assert.doesNotMatch(html,/id="openCdcAssessment"/);
current.subjectAssignments=[{className:'Class 5',subject:'Mathematics',section:'A'},{className:'Class 9',subject:'Mathematics',section:'A'}];
w.rolePageAllowed=page=>page==='cdc-assessment';
w.getDocs=async request=>{
  assert.equal(request.name,'students');
  assert.deepEqual(Array.from(request.filters[0]),['class','==','Class 5']);
  return {docs:[{id:'primary',data:()=>({class:'Class 5',section:'A',name:'Primary'})},{id:'other',data:()=>({class:'Class 5',section:'B',name:'Other'})}]};
};
const host=w.document.createElement('div');host.id='cdcAssessmentPage';w.document.body.append(host);
await w.loadCdcAssessmentPage();
assert.equal(host.querySelector('#cdcAssessmentDialog').tagName,'SECTION');
assert.deepEqual([...field('class').options].map(o=>o.value),['5']);
assert.deepEqual([...field('student').options].map(o=>o.value),['primary']);
assert.equal(field('close').hidden,true);
current.subjectAssignments=[{className:'Class 5',subject:'Nepali',section:'A'}];
serverRole={...current};
await w.loadCdcAssessmentPage();
assert.equal(field('annex3').hidden,false);
choice('unit','क्षेत्र १ — कविता (गीत/देशप्रेम)');
assert.equal(field('annexHead').rows.length,2);
assert.equal(field('annexRows').rows.length,6);
assert.equal(field('annexRows').rows[0].cells.length,8);
assert.match(field('annexHead').textContent,/थप सहायता/);
field('annexRows').rows[0].querySelector('button').click();
assert.ok(field('topic').value);
field('stage').value='regular';field('evidence').value='Synthetic first observation';field('level').value='2';
await field('save').onclick();
assert.match(field('status').textContent,/मस्यौदा राखियो/);
field('stage').value='support';field('evidence').value='Synthetic supported observation';field('level').value='3';
await field('save').onclick();
assert.match(field('status').textContent,/मस्यौदा राखियो/);
assert.equal(field('history').rows.length,2);
console.log('CDC Annex 3 staged assessment and legacy observation preservation passed');
await field('gridRead').onclick();
const gridRow=field('annexRows').rows[1];
const gridCount=observations.size;
gridRow.querySelector('[data-cdc-grid-edit="regular"]').click();
assert.equal(gridRow.querySelector('[data-cdc-grid-editor="date"]').value,'2083-08-07');
assert.equal(field('printForm').disabled,true);
gridRow.querySelector('[data-cdc-grid-editor="level"]').value='3';
gridRow.querySelector('[data-cdc-grid-editor="remarks"]').value='Synthetic remark';
await gridRow.querySelector('[data-cdc-grid-save="regular"]').onclick();
assert.equal(observations.size,gridCount+1);
assert.equal([...observations.values()].at(-1).level,3);
assert.equal([...observations.values()].at(-1).stage,'regular');
assert.equal([...observations.values()].at(-1).evidence,'');
assert.equal([...observations.values()].at(-1).feedback,'Synthetic remark');
assert.match(field('gridStatus').textContent,/सुरक्षित भयो/);
assert.match(field('annexRows').rows[1].textContent,/Synthetic remark/);
assert.equal(field('printForm').disabled,false);
console.log('Direct table date/rating entry, optional remarks and immutable school save passed');
await field('readProgress').onclick();
assert.equal(field('annualRows').rows.length,7);
assert.deepEqual([...field('annualRows').rows].map(row=>Number(row.cells[2].textContent)),[5,5,5,5,5,3,4]);
assert.equal(field('annualRows').rows[0].cells[3].textContent,'1');
assert.equal(field('annualRows').rows[0].cells[4].textContent,'B+ (3.2)');
assert.match(field('annualRows').rows[0].cells[5].textContent,/75\.00%/);
assert.equal(field('annualRows').rows[1].cells[4].textContent,'—');
const annualCalc=w.eval('cdcAnnualSubjectAchievement');
for(const [level,grade,point] of [[1,'NG',null],[2,'C+',2.4],[3,'B+',3.2],[4,'A+',4]]){
 const result=annualCalc([{unit:'U',topic:'T',level,date:'2083-01-01'}],[['U','T']]);
 assert.equal(result.grade,grade);assert.equal(result.point,point);
}
const distinct=annualCalc([
 {unit:'U',topic:'T',level:1,date:'2083-01-01'},
 {unit:'U',topic:'T',level:4,date:'2083-01-02'},
 {unit:'V',topic:'T',level:2,date:'2083-01-01'},
 {unit:'V',topic:'unknown',level:4,date:'2083-01-01'}
],[['U','T'],['V','T'],['W','T']]);
assert.equal(distinct.assessed,2);assert.equal(distinct.total,6);assert.equal(distinct.percentage,75);assert.equal(distinct.complete,false);
assert.equal(annualCalc([],[['U','T']]).grade,null);
console.log('CDC annual progress credit hours, grade scale, distinct outcomes and unassigned subjects passed');
assert.match(field('annualAttendance').textContent,/अनुमति छैन/);
assert.equal(field('printProgress').disabled,false);
let annualPrinted=0,annualMarkup='';
w.open=()=>({document:{open(){},write(value){annualMarkup=value;},close(){}},focus(){},print(){annualPrinted++;}});
field('printProgress').onclick();
assert.equal(annualPrinted,1);
const annualDoc=new JSDOM(annualMarkup).window.document;
assert.match(annualDoc.head.textContent,/A4 portrait/);
assert.match(annualDoc.body.textContent,/अनुसूची ४/);
assert.match(annualDoc.body.textContent,/Primary/);
assert.equal(annualDoc.querySelectorAll('tbody tr').length,7);
assert.equal(annualDoc.querySelectorAll('thead th').length,6);
assert.match(annualDoc.body.textContent,/विद्यालय सञ्चालन भएको दिन: ______/);
assert.match(annualDoc.body.textContent,/प्रतिशत: ______/);
assert.match(annualDoc.body.textContent,/प्रधानाध्यापक/);
assert.doesNotMatch(annualDoc.body.textContent,/Synthetic remark/);
assert.equal(annualDoc.querySelectorAll('input,select,button,textarea').length,0);
choice('period','Second Term');
assert.equal(field('printProgress').disabled,true);
field('printProgress').onclick();
assert.equal(annualPrinted,1);
choice('period','First Term');
console.log('Annex 4 annual print A4, six columns, seven subjects, privacy and stale snapshot protection passed');
const attendanceCalc=w.eval('cdcAttendanceSummary');
const selection={studentId:'primary',className:'Class 5',academicYear:'2083'};
const daily=(date,status,extra={})=>({className:'Class 5',academicYear:'2083',attendanceType:'daily',date,students:status?[{studentId:'primary',status}]:[],...extra});
const attendance=attendanceCalc([
 daily('2026-05-01','present'),daily('2026-05-01','present'),
 daily('2026-05-02','absent'),daily('2026-05-03','leave'),
 daily('2026-05-04','present'),daily('2026-05-04','absent'),
 daily('2026-05-05',null),daily('2026-05-06','present',{attendanceType:'subject'}),
 daily('2026-05-07','present',{academicYear:'2082'}),
 daily('2026-05-08','present',{className:'Class 4'})
],selection);
assert.equal(attendance.recordedDays,5);
assert.equal(attendance.assessed,3);
assert.equal(attendance.present,1);
assert.equal(attendance.unresolved,2);
assert.ok(Math.abs(attendance.percentage-100/3)<1e-8);
assert.equal(attendanceCalc([],selection).percentage,null);
console.log('CDC annual attendance excludes wrong scope, duplicate dates, missing and conflicting status passed');
for(const [subject,unit,count] of [
  ['Mathematics','ज्यामिति',8],
  ['Social Studies and Human Values Education','हामी र हाम्रो समुदाय',8],
  ['Science and Technology','वैज्ञानिक सिकाइ',6],
  ['Health, Physical Education and Creative Arts','व्यक्तिगत स्वच्छता',7]
]){
  current.subjectAssignments=[{className:'Class 5',subject,section:'A'}];
  serverRole={...current};
  await w.loadCdcAssessmentPage();
  choice('unit',unit);
  assert.equal(field('annex3').hidden,false,subject);
  assert.ok(field('annexRows').rows.length,subject);
  assert.equal(field('annexRows').rows[0].cells.length,count,subject);
  assert.equal([...field('annexFoot').rows[0].cells].reduce((n,cell)=>n+cell.colSpan,0),count,subject);
}
console.log('CDC subject-specific annex column counts passed');
console.log('Standalone assessment navigation, primary-only assignment reads and inline display passed');
// Grade 3 revised Annex 3 theme uses one row per outcome and the fixed full-theme denominator.
current.subjectAssignments=[{className:'Class 3',subject:'Mathematics',section:'A'}];
serverRole={...current};
w.getDocs=async request=>{
  assert.equal(request.name,'students');
  assert.deepEqual(Array.from(request.filters[0]),['class','==','Class 3']);
  return {docs:[{id:'three',data:()=>({class:'Class 3',section:'A',name:'Grade 3 synthetic'})}]};
};
await w.loadCdcAssessmentPage();
choice('unit','नाप');
assert.ok(field('outcomePicker').options.length>1);
assert.equal(field('annex3').hidden,true);
choice('unit','मेरो दैनिक जीवन');
assert.equal(field('annex3').hidden,false);
assert.equal(field('annexRows').rows.length,12);
assert.equal(field('annexRows').rows[0].cells[0].rowSpan,12);
assert.equal(field('annexRows').rows[0].cells[1].rowSpan,4);
assert.match(field('annexStatus').textContent,/153/);
assert.match(field('annexHead').textContent,/साधन/);
assert.equal(field('outcomePicker').options.length,4);
assert.equal(field('printForm').disabled,true);
await field('gridRead').onclick();
const legacyRow=field('annexRows').rows[0];
legacyRow.querySelector('[data-cdc-grid-edit="regular"]').click();
legacyRow.querySelector('[data-cdc-grid-editor="level"]').value='3';
legacyRow.querySelector('[data-cdc-grid-editor="remarks"]').value='Clock observation';
await legacyRow.querySelector('[data-cdc-grid-save="regular"]').onclick();
assert.equal([...observations.values()].at(-1).academicYear,'2083');
assert.equal([...observations.values()].at(-1).method,'Clock observation');
assert.equal([...observations.values()].at(-1).feedback,'');
assert.match(field('annexFoot').textContent,/75\.00%/);
assert.match(field('annexFoot').textContent,/1 \/ 3/);
console.log('Current 2083 grade 3 legacy rubric and method save passed');
assert.match(field('revisedCurriculumSource').textContent,/२०८४/);
w.currentSchoolSettings.academicYear='2084';
await w.loadCdcAssessmentPage();
choice('unit','मेरो दैनिक जीवन');
assert.equal(field('annex3').hidden,false);
assert.equal(field('annexRows').rows.length,3);
assert.equal(field('annexRows').rows[0].cells.length,8);
assert.equal(field('annexFoot').rows[0].cells[0].rowSpan,2);
assert.match(field('annexFoot').textContent,/3 × 4/);
assert.match(field('annexStatus').textContent,/215/);
assert.match(field('annexFoot').textContent,/0 \/ 3/);
field('annexRows').querySelector('button').click();
assert.match(field('topic').value,/घडी/);
field('stage').value='regular';field('level').value='3';field('evidence').value='Synthetic clock reading';
await field('save').onclick();
assert.match(field('status').textContent,/मस्यौदा राखियो/);
await field('saveSchool').onclick();
assert.match(field('status').textContent,/विद्यालयमा सुरक्षित भयो/);
assert.match(field('schoolStatus').textContent,/1 अवलोकन/);
assert.equal([...observations.values()].at(-1).className,'Class 3');
assert.equal([...observations.values()].at(-1).stage,'regular');
assert.equal([...observations.values()].at(-1).academicYear,'2084');
assert.doesNotMatch(field('annexFoot').textContent,/75\.00%/);
assert.match(field('annexFoot').textContent,/1 \/ 3/);
for(let i=1;i<3;i++){
  field('annexRows').rows[i].querySelector('button').click();
  field('stage').value='regular';field('level').value='3';field('evidence').value='Synthetic assessment '+i;
  await field('save').onclick();await field('saveSchool').onclick();
  assert.match(field('status').textContent,/विद्यालयमा सुरक्षित भयो/);
}
assert.match(field('annexFoot').textContent,/75\.00%/);
assert.match(field('annexFoot').textContent,/3 \/ 3/);
assert.equal(field('revisedCurriculumSource').hidden,false);
assert.match(field('revisedCurriculumSource').href,/id=1259$/);
assert.equal(field('printForm').disabled,false);
let printed=false,printedMarkup='';
w.open=()=>({document:{open(){},write(markup){printedMarkup=markup;},close(){}},focus(){},print(){printed=true;}});
field('printForm').onclick();
assert.equal(printed,true);
const printDoc=new JSDOM(printedMarkup).window.document;
assert.match(printDoc.body.textContent,/Grade 3 synthetic/);
assert.match(printDoc.body.textContent,/75\.00%/);
assert.match(printDoc.head.textContent,/A4 landscape/);
assert.equal(printDoc.querySelectorAll('button,input,select,textarea').length,0);
assert.doesNotMatch(printDoc.body.textContent,/Synthetic clock reading/);
choice('unit','नाप');
assert.equal(field('printForm').disabled,true);
assert.equal(field('annex3').hidden,true);
for(const [grade,unit,count,page] of [
 ['1','म र मेरो परिवार',4,202],['1','मेरो दैनिक जीवन',2,203],
 ['2','म र मेरो परिवार',5,207],['2','मेरो दैनिक जीवन',2,208],
 ['3','म र मेरो परिवार',6,214],['3','मेरो दैनिक जीवन',3,215],
 ['1','हाम्रो समुदाय',5,204],['1','मेरो विद्यालय',4,205],['1','सञ्चार प्रविधि र बजार',2,206],
 ['2','सङ्ख्याको ज्ञान',2,209],['2','हाम्रो समुदाय',4,210],['2','मेरो विद्यालय',5,211],['2','सञ्चार प्रविधि र बजार',4,212],['2','गणितका आधारभूत क्रिया',4,213],
 ['3','सङ्ख्याको ज्ञान',4,216],['3','हाम्रो समुदाय',3,217],['3','मेरो विद्यालय',4,218],['3','गणितका आधारभूत क्रिया',5,219],['3','सञ्चार प्रविधि र बजार',7,220]
]){
 current.subjectAssignments=[{className:'Class '+grade,subject:'Mathematics',section:'A'}];
 serverRole={...current};
 w.getDocs=async request=>({docs:[{id:'math-'+grade,data:()=>({class:'Class '+grade,section:'A',name:'Synthetic grade '+grade})}]});
 await w.loadCdcAssessmentPage();choice('unit',unit);
 assert.equal(field('annex3').hidden,false,grade+unit);
 assert.equal(field('annexRows').rows.length,count,grade+unit);
 assert.equal(field('outcomePicker').options.length,count+1,grade+unit);
 assert.equal(new Set([...field('outcomePicker').options].slice(1).map(o=>o.value)).size,count,grade+unit);
 assert.equal(field('annexRows').rows[0].cells.length,8);
 assert.match(field('annexStatus').textContent,new RegExp(String(page)));
 assert.ok(field('annexFoot').textContent.includes(count+' × 4'));
 assert.equal(field('printForm').disabled,true);
}
console.log('All 19 revised mathematics forms, 2083/2084 curriculum isolation, fixed denominator, unique outcome picker and print isolation passed');
w.currentSchoolSettings.academicYear='2083';
current.subjectAssignments=[{className:'Class 2',subject:'Mathematics',section:'A'}];
serverRole={...current};
w.getDocs=async()=>({docs:[{id:'math-2',data:()=>({class:'Class 2',section:'A',name:'Synthetic grade 2'})}]});
await w.loadCdcAssessmentPage();
for(const [unit,count,page] of [['मेरो सिर्जना',3,149],['सञ्चार प्रविधि र बजार',4,150],['हाम्रो विद्यालय',5,147],['सङ्ख्याको ज्ञान',4,151],['गणितका आधारभूत क्रिया',4,152]]){
 choice('unit',unit);
 assert.equal(field('annex3').hidden,false);
 assert.equal(field('annexRows').rows.length,count*4);
 assert.equal(field('annexRows').rows[0].cells[0].rowSpan,count*4);
 assert.equal(field('outcomePicker').options.length,count+1);
 assert.match(field('annexStatus').textContent,new RegExp(String(page)));
}
current.subjectAssignments=[{className:'Class 3',subject:'Mathematics',section:'A'}];
serverRole={...current};
w.getDocs=async()=>({docs:[{id:'three',data:()=>({class:'Class 3',section:'A',name:'Grade 3 synthetic'})}]});
await w.loadCdcAssessmentPage();
choice('unit','हाम्रो समुदाय');
assert.equal(field('annexRows').rows.length,24);
assert.equal(field('outcomePicker').options.length,7);
assert.match(field('annexRows').textContent,/७०००/);
assert.match(field('annexRows').textContent,/९९९९/);
assert.match(field('annexStatus').textContent,/154/);
for(const [unit,count,page] of [['मेरो सिर्जना',6,156],['सञ्चार प्रविधि र बजार',10,158],['सङ्ख्याको ज्ञान',6,160],['गणितका आधारभूत क्रिया',5,162]]){
 choice('unit',unit);
 assert.equal(field('annex3').hidden,false,unit);
 assert.equal(field('annexRows').rows.length,count*4,unit);
 assert.equal(field('annexRows').rows[0].cells[0].rowSpan,count*4,unit);
 assert.equal(field('outcomePicker').options.length,count+1,unit);
 assert.equal(new Set([...field('outcomePicker').options].slice(1).map(o=>o.value)).size,count,unit);
 assert.match(field('annexStatus').textContent,new RegExp(String(page)));
}
assert.match(field('annexRows').textContent,/तीन अङ्क × दुई अङ्क/);
assert.match(field('annexRows').textContent,/शेष नरहने/);
for(const [grade,unit,count,page] of [
 ['1','म र मेरो परिवार',4,136],['1','मेरो दैनिक जीवन',2,138],['1','हाम्रो समुदाय',8,139],
 ['1','हाम्रो विद्यालय',5,141],['1','मेरो सिर्जना',2,142],['1','सञ्चार प्रविधि र बजार',2,143],
 ['2','म र मेरो परिवार',2,144],['2','मेरो दैनिक जीवन',2,145],['2','हाम्रो समुदाय',4,146]
]){
 current.subjectAssignments=[{className:'Class '+grade,subject:'Mathematics',section:'A'}];
 serverRole={...current};
 w.getDocs=async()=>({docs:[{id:'math-'+grade,data:()=>({class:'Class '+grade,section:'A',name:'Synthetic grade '+grade})}]});
 await w.loadCdcAssessmentPage();choice('unit',unit);
 assert.equal(field('annex3').hidden,false,unit);
 assert.equal(field('annexRows').rows.length,count*4,unit);
 assert.equal(field('annexRows').rows[0].cells[0].rowSpan,count*4,unit);
 assert.equal(field('outcomePicker').options.length,count+1,unit);
 assert.equal(new Set([...field('outcomePicker').options].slice(1).map(o=>o.value)).size,count,unit);
 assert.match(field('annexStatus').textContent,new RegExp(String(page)));
 assert.match(field('annexHead').textContent,grade==='1'?/कैफियत/:/साधन/);
}
assert.equal(Object.keys(legacyForms).length,20);
assert.equal(Object.values(legacyForms).reduce((n,f)=>n+f.rows.length,0),87);
assert.ok(Object.values(legacyForms).every(f=>f.rows.every(r=>r.criteria.length===4)));
console.log('Twenty current-year mathematics rubric themes, 87 outcomes, 348 criteria and class-specific columns passed');
// Grade 1 Nepali: one rating per outcome, not per instrument.
current.subjectAssignments=[{className:'Class 1',subject:'Nepali',section:'A'}];
serverRole={...current};
w.getDocs=async()=>({docs:[{id:'nepali-1',data:()=>({class:'Class 1',section:'A',name:'Synthetic Grade 1 Nepali'})}]});
const beforePreview=observations.size;
await w.loadCdcAssessmentPage();
for(const [unit,count,page,editable] of [
 ['म र मेरो परिवार',8,103,true],['मेरो दैनिक जीवन',12,104,true],
 ['हाम्रो समुदाय',13,105,true],['हाम्रो विद्यालय',13,106,true],
 ['हाम्रो वातावरण',14,107,true],['मेरो सिर्जना',14,108,true],
 ['बोध र वाणी',15,109,true],['हाम्रो संस्कृति',15,110,true],
 ['सूचना प्रविधि र बजार',15,111,true],['हाम्रो क्रियाकलाप',15,112,true],
 ['हाम्रो वरपरको संसार',16,113,true]
]){
 choice('unit',unit);
 assert.equal(field('annex3').hidden,false,unit);
 assert.equal(field('annexRows').rows.length,count,unit);
 assert.ok([...field('annexRows').rows].every(row=>row.cells.length===8));
 assert.match(field('annexStatus').textContent,new RegExp(String(page)));
 assert.equal(field('gridRead').hidden,!editable);
 assert.equal(field('printForm').disabled,true);
 assert.equal(field('annexRows').querySelectorAll('button,input,select,textarea').length,0);
 const titles=[...field('outcomePicker').options].slice(1).map(o=>o.value);
 assert.equal(titles.length,count,unit);
 assert.equal(new Set(titles).size,count,unit);
 await field('gridRead').onclick();
 assert.equal(field('annexRows').querySelectorAll('[data-cdc-grid-edit]').length,2*count,unit);
 assert.equal(field('printForm').disabled,false,unit);
}
assert.equal(observations.size,beforePreview);
choice('unit','हाम्रो वातावरण');
assert.match(field('annexRows').rows[4].cells[0].textContent,/क वर्ण/);
choice('unit','बोध र वाणी');
assert.equal(field('annexUnit').textContent,'रुचि र बानी');
assert.match(field('annexRows').rows[4].cells[0].textContent,/ञ/);
choice('unit','सूचना प्रविधि र बजार');
assert.equal(field('annexUnit').textContent,'सञ्चार प्रविधि र बजार');
choice('unit','हाम्रो क्रियाकलाप');
assert.equal(field('annexUnit').textContent,'हाम्रा क्रियाकलाप');
assert.match(field('annexRows').rows[8].cells[0].textContent,/ध्वनि/);
choice('unit','हाम्रो वरपरको संसार');
assert.match(field('annexRows').rows[5].cells[0].textContent,/संयुक्त/);
choice('unit','मेरो दैनिक जीवन');
await field('gridRead').onclick();
assert.match(field('schoolStatus').textContent,/अवलोकन|अभिलेख छैन/);
const nepaliRow=field('annexRows').rows[0];
nepaliRow.querySelector('[data-cdc-grid-edit="regular"]').click();
nepaliRow.querySelector('[data-cdc-grid-editor="level"]').value='3';
await nepaliRow.querySelector('[data-cdc-grid-save="regular"]').onclick();
assert.equal(observations.size,beforePreview+1);
assert.equal([...observations.values()].at(-1).topic,'कुराकानी, संवाद र प्रश्नोत्तरमा प्रसङ्गअनुसार भाषा प्रयोग गर्ने');
assert.equal([...observations.values()].at(-1).stage,'regular');
assert.match(field('annexFoot').textContent,/75\.00%/);
assert.match(field('annexFoot').textContent,/1 \/ 12/);
choice('unit','हाम्रो समुदाय');
assert.match(field('annexRows').rows[3].textContent,/उ, ऊ, ऋ र ए/);
await field('gridRead').onclick();
assert.equal(field('annexRows').querySelectorAll('[data-cdc-grid-edit]').length,26);
choice('unit','मेरो विद्यालय');
assert.equal(field('unit').value,'हाम्रो विद्यालय');
assert.equal(field('annexUnit').textContent,'मेरो विद्यालय');
assert.match(field('annexRows').rows[3].cells[0].textContent,/^ऐ, ओ, औ/);
assert.equal(field('annexRows').querySelectorAll('button,input,select,textarea').length,0);
const oldSchoolTopic='ए, ओ, औ, अं र अः स्वर वर्ण चिन्ने र उच्चारण गर्ने';
const newSchoolTopic='ऐ, ओ, औ, अं र अः स्वर वर्ण चिन्ने र उच्चारण गर्ने';
const oldKey='cdc_observations/synthetic-legacy-nepali-school';
observations.set(oldKey,{...[...observations.values()].at(-1),unit:'हाम्रो विद्यालय',topic:oldSchoolTopic,level:2});
await field('gridRead').onclick();
assert.match(field('annexStatus').textContent,/फरक पुरानो शीर्षकका 1 अभिलेख/);
assert.match(field('schoolRows').textContent,/ए, ओ, औ/);
const correctedRow=field('annexRows').rows[3];
assert.equal(correctedRow.cells[3].textContent,'');
assert.ok([...field('outcomePicker').options].some(o=>o.value===newSchoolTopic));
assert.ok(![...field('outcomePicker').options].some(o=>o.value===oldSchoolTopic));
correctedRow.querySelector('[data-cdc-grid-edit="regular"]').click();
correctedRow.querySelector('[data-cdc-grid-editor="level"]').value='4';
await correctedRow.querySelector('[data-cdc-grid-save="regular"]').onclick();
assert.equal(observations.get(oldKey).level,2);
assert.equal(observations.get(oldKey).topic,oldSchoolTopic);
assert.equal([...observations.values()].at(-1).topic,newSchoolTopic);
assert.equal([...observations.values()].at(-1).level,4);
assert.match(field('annexFoot').textContent,/1 \/ 13/);
choice('unit','सञ्चार प्रविधि र बजार');
assert.equal(field('unit').value,'सूचना प्रविधि र बजार');
await field('gridRead').onclick();
assert.equal(field('annexRows').querySelectorAll('[data-cdc-grid-edit]').length,30);
assert.ok([...w.document.querySelectorAll('#cdcUnitSuggestions option')].some(o=>o.value==='रुचि र बानी'));
assert.equal(observations.size,beforePreview+3);
w.currentSchoolSettings.academicYear='2084';
await w.loadCdcAssessmentPage();
choice('unit','म र मेरो परिवार');
assert.equal(field('annex3').hidden,true);
assert.equal(observations.size,beforePreview+3);
console.log('Grade 1 Nepali eleven editable themes, 150 outcome rows, corrected key isolation, safe stage entry and year isolation passed');
// Grade 2 new thematic forms stay separate from the legacy skill catalogue.
w.currentSchoolSettings.academicYear='2083';
current.subjectAssignments=[{className:'Class 2',subject:'Nepali',section:'A'}];
serverRole={...current};
w.getDocs=async()=>({docs:[{id:'nepali-2',data:()=>({class:'Class 2',section:'A',name:'Synthetic Grade 2 Nepali'})}]});
await w.loadCdcAssessmentPage();
const beforeGrade2=observations.size;
for(const [unit,count,page] of [
 ['म र मेरो परिवार',11,114],['मेरो दैनिक जीवन',12,115],['हाम्रो समुदाय',13,116],
 ['मेरो विद्यालय',14,117],['हाम्रो वातावरण',15,118],['मेरो सिर्जना',16,119],['रुचि र बानी',16,120],
 ['हाम्रो संस्कृति',16,121],['सञ्चार प्रविधि र बजार',17,122],['हाम्रा क्रियाकलाप',17,123],['हाम्रो वरपरको संसार',18,124]
]){
 choice('unit',unit);
 assert.equal(field('annex3').hidden,false,unit);
 assert.match(field('annexIdentity').textContent,/कक्षा: २/);
 assert.equal(field('annexRows').rows.length,count,unit);
 assert.equal(field('outcomePicker').options.length,count+1,unit);
 assert.equal(new Set([...field('outcomePicker').options].slice(1).map(o=>o.value)).size,count,unit);
 assert.match(field('annexStatus').textContent,new RegExp(String(page)));
 await field('gridRead').onclick();
 assert.equal(field('annexRows').querySelectorAll('[data-cdc-grid-edit]').length,count*2,unit);
 assert.equal(field('printForm').disabled,false,unit);
}
assert.equal(observations.size,beforeGrade2);
assert.match(field('annexRows').rows[14].cells[0].textContent,/शब्द जोडेर/);
assert.match(field('annexRows').rows[15].cells[0].textContent,/शब्द निर्माण अभ्यास/);
choice('unit','रुचि र बानी');await field('gridRead').onclick();
const grade2Row=field('annexRows').rows[0];
grade2Row.querySelector('[data-cdc-grid-edit="regular"]').click();
grade2Row.querySelector('[data-cdc-grid-editor="level"]').value='3';
await grade2Row.querySelector('[data-cdc-grid-save="regular"]').onclick();
assert.equal(observations.size,beforeGrade2+1);
assert.equal([...observations.values()].at(-1).unit,'रुचि र बानी');
assert.equal([...observations.values()].at(-1).className,'Class 2');
assert.match(field('annexFoot').textContent,/1 \/ 16/);
choice('unit','सुनाइ र बोलाइ');
assert.equal(field('annex3').hidden,true);
assert.ok(field('outcomePicker').options.length>1);
w.currentSchoolSettings.academicYear='2084';
await w.loadCdcAssessmentPage();
choice('unit','म र मेरो परिवार');
assert.equal(field('annex3').hidden,true);
assert.equal(observations.size,beforeGrade2+1);
console.log('Grade 2 Nepali eleven thematic forms, 165 outcomes, stage entry and legacy skill/year isolation passed');
// Grade 3 first two thematic forms remain isolated by class and year.
w.currentSchoolSettings.academicYear='2083';
current.subjectAssignments=[{className:'Class 3',subject:'Nepali',section:'A'}];
serverRole={...current};
w.getDocs=async()=>({docs:[{id:'nepali-3',data:()=>({class:'Class 3',section:'A',name:'Synthetic Grade 3 Nepali'})}]});
await w.loadCdcAssessmentPage();
const beforeGrade3=observations.size;
for(const [unit,count,page] of [
 ['म र मेरो परिवार',11,125],['मेरो दैनिक जीवन',13,126],['हाम्रो समुदाय',15,127],
 ['मेरो विद्यालय',17,128],['हाम्रो वातावरण',18,129],['मेरो सिर्जना',19,130],
 ['रुचि र बानी',20,131],['हाम्रो संस्कृति',22,132],['सञ्चार प्रविधि र बजार',22,133],
 ['हाम्रा क्रियाकलाप',22,134],['हाम्रो वरपरको संसार',22,135]
]){
 choice('unit',unit);
 assert.equal(field('annex3').hidden,false,unit);
 assert.match(field('annexIdentity').textContent,/कक्षा: ३/);
 assert.equal(field('annexRows').rows.length,count,unit);
 assert.equal(field('outcomePicker').options.length,count+1,unit);
 assert.equal(new Set([...field('outcomePicker').options].slice(1).map(o=>o.value)).size,count,unit);
 assert.match(field('annexStatus').textContent,new RegExp(String(page)));
 await field('gridRead').onclick();
 assert.equal(field('annexRows').querySelectorAll('[data-cdc-grid-edit]').length,count*2,unit);
}
assert.equal(observations.size,beforeGrade3);
assert.match(field('annexRows').rows[21].cells[0].textContent,/परियोजना कार्य/);
assert.notEqual(field('annexRows').rows[6].cells[0].textContent,field('annexRows').rows[21].cells[0].textContent);
assert.match(field('annexRows').rows[21].cells[2].textContent,/परियोजना कार्य/);
choice('unit','मेरो दैनिक जीवन');await field('gridRead').onclick();
const grade3Row=field('annexRows').rows[12];
grade3Row.querySelector('[data-cdc-grid-edit="regular"]').click();
grade3Row.querySelector('[data-cdc-grid-editor="level"]').value='4';
await grade3Row.querySelector('[data-cdc-grid-save="regular"]').onclick();
assert.equal(observations.size,beforeGrade3+1);
assert.equal([...observations.values()].at(-1).className,'Class 3');
assert.match([...observations.values()].at(-1).topic,/लिङ्ग, वचन, पुरुष/);
choice('unit','सुनाइ र बोलाइ');
assert.equal(field('annex3').hidden,true);
assert.ok(field('outcomePicker').options.length>1);
w.currentSchoolSettings.academicYear='2084';
await w.loadCdcAssessmentPage();
choice('unit','म र मेरो परिवार');
assert.equal(field('annex3').hidden,true);
console.log('Grade 3 Nepali eleven thematic forms, 201 outcome rows, distinct project-work key, stage entry and legacy skill/year isolation passed');
// Grade 1 English: preserve original keys, English-only form labels and four skill groups.
w.currentSchoolSettings.academicYear='2083';
current.subjectAssignments=[{className:'Class 1',subject:'English',section:'A'}];
serverRole={...current};
w.getDocs=async()=>({docs:[{id:'english-1',data:()=>({class:'Class 1',section:'A',name:'Synthetic Grade 1 English'})}]});
await w.loadCdcAssessmentPage();
const beforeEnglish=observations.size;
let outcomeCount=0;
for(const [unit,groups] of [
 ['वर्णमाला',[9,5,5,5]],['म र मेरो परिवार',[4,5,5,4]],['मेरो दैनिक जीवन',[5,4,5,3]],
 ['हाम्रो विद्यालय',[4,4,6,7]],['हाम्रो वातावरण',[4,4,7,6]],['मेरा सरसामान',[5,4,6,6]],
 ['हाम्रो संस्कृति',[5,4,6,7]],['सञ्चार प्रविधि र बजार',[5,4,6,6]],
 ['फलफूल र तरकारी',[4,4,6,6]],['रुचि र सोख',[3,3,6,6]],['चराचुरुङ्गी र जनावर',[5,5,6,6]]
]){
 choice('unit',unit);
 const count=groups.reduce((a,b)=>a+b,0);
 outcomeCount+=count;
 assert.equal(field('annex3').hidden,false,unit);
 assert.equal(field('annexRows').rows.length,count,unit);
 assert.equal(field('outcomePicker').options.length,count+1,unit);
 assert.doesNotMatch(field('annexTable').textContent,/[\u0900-\u097f]/u);
 assert.doesNotMatch(field('annexUnit').textContent,/[\u0900-\u097f]/u);
 let offset=0;
 for(const [i,skill] of ['Listening','Speaking','Reading','Writing'].entries()){
   const row=field('annexRows').rows[offset];
   assert.equal(row.cells[0].textContent,String(i+1));
   assert.equal(row.cells[1].textContent,skill);
   assert.equal(row.cells[0].rowSpan,groups[i]);
   assert.equal(row.cells[1].rowSpan,groups[i]);
   offset+=groups[i];
 }
 await field('gridRead').onclick();
 assert.equal(field('annexRows').querySelectorAll('[data-cdc-grid-edit]').length,count*2,unit);
 assert.equal(field('printForm').disabled,false,unit);
}
assert.equal(outcomeCount,225);
assert.equal(observations.size,beforeEnglish);
choice('unitEn','Alphabet');
await field('gridRead').onclick();
const alphabetRow=field('annexRows').rows[0];
alphabetRow.querySelector('[data-cdc-grid-edit="regular"]').click();
alphabetRow.querySelector('[data-cdc-grid-editor="level"]').value='3';
await alphabetRow.querySelector('[data-cdc-grid-save="regular"]').onclick();
assert.equal(observations.size,beforeEnglish+1);
const englishObservation=[...observations.values()].at(-1);
assert.equal(englishObservation.unit,'वर्णमाला');
assert.equal(englishObservation.topic,'सुनेका ध्वनि दोहोर्‍याउने, चिन्ने र छुट्याउने');
assert.equal(englishObservation.topicAlt,'Copy, recognize and distinguish sounds');
assert.match(field('annexFoot').textContent,/1 \/ 24/);
w.currentSchoolSettings.academicYear='2084';
await w.loadCdcAssessmentPage();
choice('unitEn','Alphabet');
assert.equal(field('annex3').hidden,true);
console.log('Grade 1 English eleven thematic forms, 225 outcomes, English-only skill groups, original record keys and year isolation passed');
// Grade 2 theme forms use source-specific subsets, not every skill outcome.
w.currentSchoolSettings.academicYear='2083';
current.subjectAssignments=[{className:'Class 2',subject:'English',section:'A'}];
serverRole={...current};
w.getDocs=async()=>({docs:[{id:'english-2',data:()=>({class:'Class 2',section:'A',name:'Synthetic Grade 2 English'})}]});
await w.loadCdcAssessmentPage();
const beforeEnglish2=observations.size;
let english2Count=0;
for(const [unit,groups] of [
 ['Me and My Family',[9,5,7,7]],['My daily life',[8,6,9,8]],['My school',[7,5,8,8]],
 ['Our environment',[7,6,8,8]],['My Belongings',[6,6,8,8]],['Our culture',[6,6,8,9]],
 ['Communication, technology and market',[6,7,8,8]],['Fruits and vegetables',[6,6,8,7]],
 ['Hobbies and interests',[6,5,8,7]],['Birds and animals',[6,6,8,8]]
]){
 choice('unitEn',unit);
 const count=groups.reduce((a,b)=>a+b,0);
 english2Count+=count;
 assert.equal(field('annex3').hidden,false,unit);
 assert.match(field('annexIdentity').textContent,/Grade: 2/);
 assert.equal(field('annexRows').rows.length,count,unit);
 assert.equal(field('outcomePicker').options.length,count+1,unit);
 assert.equal(new Set([...field('outcomePicker').options].slice(1).map(o=>o.value)).size,count);
 assert.doesNotMatch(field('annexTable').textContent,/[\u0900-\u097f]/u);
 assert.doesNotMatch(field('annexUnit').textContent,/[\u0900-\u097f]/u);
 let offset=0;
 for(const [i,skill] of ['Listening','Speaking','Reading','Writing'].entries()){
   const row=field('annexRows').rows[offset];
   assert.equal(row.cells[1].textContent,skill);
   assert.equal(row.cells[1].rowSpan,groups[i]);
   offset+=groups[i];
 }
 if(unit==='My daily life')assert.match(field('annexStatus').textContent,/repeats handwriting/);
 await field('gridRead').onclick();
 assert.equal(field('annexRows').querySelectorAll('[data-cdc-grid-edit]').length,count*2,unit);
 assert.equal(field('printForm').disabled,false,unit);
}
assert.equal(english2Count,283);
assert.equal(observations.size,beforeEnglish2);
choice('unitEn','Me and My Family');
await field('gridRead').onclick();
const english2Row=field('annexRows').rows[0];
english2Row.querySelector('[data-cdc-grid-edit="regular"]').click();
english2Row.querySelector('[data-cdc-grid-editor="level"]').value='3';
await english2Row.querySelector('[data-cdc-grid-save="regular"]').onclick();
assert.equal(observations.size,beforeEnglish2+1);
assert.equal([...observations.values()].at(-1).unit,'Me and My Family');
assert.equal([...observations.values()].at(-1).topic,'Distinguish sounds that you hear');
assert.equal([...observations.values()].at(-1).className,'Class 2');
assert.match(field('annexFoot').textContent,/1 \/ 28/);
choice('unitEn','Listening');
assert.equal(field('annex3').hidden,true);
assert.ok(field('outcomePicker').options.length>1);
w.currentSchoolSettings.academicYear='2084';
await w.loadCdcAssessmentPage();
choice('unitEn','Me and My Family');
assert.equal(field('annex3').hidden,true);
console.log('Grade 2 English ten thematic forms, 283 unique outcome rows, English-only stage entry, legacy skill/year isolation passed');
// Grade 3 themes checked against CDC 2076 Student Assessment Guide PDF pp.114–123; print and wording still pending.
w.currentSchoolSettings.academicYear='2083';
current.subjectAssignments=[{className:'Class 3',subject:'English',section:'A'}];
serverRole={...current};
w.getDocs=async()=>({docs:[{id:'english-3',data:()=>({class:'Class 3',section:'A',name:'Synthetic Grade 3 English'})}]});
await w.loadCdcAssessmentPage();
const beforeEnglish3=observations.size;
for(const [unit,groups] of [["Me and My Family",[7,3,9,7]],["My School",[5,5,5,7]],["Our Environment",[5,5,6,8]],["My Belongings",[4,4,4,8]],["Our Culture",[6,5,7,7]],["Communication Technology and Market",[6,6,7,8]],["Fruits and Vegetables",[6,5,6,9]],["Hobbies and Interests",[5,4,6,9]],["Birds and Animals",[5,4,6,4]],["My Daily Life",[7,4,4,8]]]){
 choice('unitEn',unit);
 const count=groups.reduce((a,b)=>a+b,0);
 assert.equal(field('annex3').hidden,false,unit);
 assert.match(field('annexIdentity').textContent,/Grade: 3/);
 assert.equal(field('annexRows').rows.length,count,unit);
 assert.equal(field('outcomePicker').options.length,count+1,unit);
 assert.equal(new Set([...field('outcomePicker').options].slice(1).map(o=>o.value)).size,count,unit);
 assert.doesNotMatch(field('annexTable').textContent,/[\u0900-\u097f]/u);
 assert.match(field('annexStatus').textContent,/CDC 2076 Student Assessment Guide, PDF page 1[12][0-9]/);
 if(unit==='Birds and Animals'){
   assert.match(field('annexRows').rows[0].textContent,/Respond with words or gestures/);
   assert.match(field('annexRows').rows[18].textContent,/Write neatly and legibly/);
 }
 if(unit==='My School')assert.match(field('annexUnit').textContent,/Our School/);
 let offset=0;
 for(const [i,skill] of ['Listening','Speaking','Reading','Writing'].entries()){
   const row=field('annexRows').rows[offset];
   assert.equal(row.cells[1].textContent,skill);
   assert.equal(row.cells[1].rowSpan,groups[i]);
   offset+=groups[i];
 }
 await field('gridRead').onclick();
 assert.equal(field('annexRows').querySelectorAll('[data-cdc-grid-edit]').length,count*2,unit);
 assert.equal(field('printForm').disabled,false,unit);
}
assert.equal(observations.size,beforeEnglish3);
const english3Row=field('annexRows').rows[0];
english3Row.querySelector('[data-cdc-grid-edit="regular"]').click();
english3Row.querySelector('[data-cdc-grid-editor="level"]').value='3';
await english3Row.querySelector('[data-cdc-grid-save="regular"]').onclick();
assert.equal(observations.size,beforeEnglish3+1);
assert.equal([...observations.values()].at(-1).unit,'My Daily Life');
assert.equal([...observations.values()].at(-1).className,'Class 3');
assert.equal([...observations.values()].at(-1).topic,'Recognize and produce rhyming words');
assert.match(field('annexFoot').textContent,/1 \/ 23/);
choice('unitEn','Listening');
assert.equal(field('annex3').hidden,true);
assert.ok(field('outcomePicker').options.length>1);
w.currentSchoolSettings.academicYear='2084';
await w.loadCdcAssessmentPage();
choice('unitEn','Me and My Family');
assert.equal(field('annex3').hidden,true);
console.log('Grade 3 English ten assessment-guide themes, 236 outcome rows, scoped saves and year isolation passed');
// Binary evidence Save/Load remains separate from legacy observations.
w.currentSchoolSettings.academicYear='2083';
current.subjectAssignments=[{className:'Class 1',subject:'serophero',section:'A'}];
serverRole={...current};
w.getDocs=async()=>({docs:[{id:'sero-1',data:()=>({class:'Class 1',section:'A',name:'Synthetic Student'})}]});
w.ledgerSubjectsForClass=()=>['serophero'];
await w.loadCdcAssessmentPage();
// Independent public curriculum summary does not switch the current assessment.
const entryClassBefore=field('class').value,entrySubjectBefore=field('subject').value,entryStudentBefore=field('student').value;
const summaryRows=()=>[...field('themeSummaryRows').rows];
// Uploaded 2083 guide, Annex 3(f): PDF pages 123–148.
const healthSourceCounts={'4':[5,6,6,10,5,4,10,12,6,7,7,5,3],'5':[5,6,6,10,5,4,10,12,6,7,8,6,3]};
for(const grade of ['4','5']){
 choice('summaryClass',grade);choice('summarySubject','healthphysicalcreativeart');
 const rows=summaryRows(),counts=healthSourceCounts[grade];
 assert.equal(rows.length,13);
 const number=v=>Number(v.replace(/[०-९]/g,d=>'०१२३४५६७८९'.indexOf(d)));
 for(const [i,row] of rows.entries()){
  assert.equal(number(row.cells[2].textContent),counts[i]);
  assert.equal(number(row.cells[3].textContent),counts[i]*4);
  assert.match(row.cells[4].textContent,/सङ्ख्या मिलेको|count matched/);
  const url=row.cells[4].querySelector('a').href;
  assert.equal(url,field('guidePdf45').href.split('#')[0]+'#page='+((grade==='4'?123:136)+i));
 }
 assert.equal(field('class').value,entryClassBefore);
 assert.equal(field('student').value,entryStudentBefore);
}
// Remaining upper-primary Annex 3 forms: verify each source count,
// maximum and page link, including the two split-page forms.
const upperSourceCases=[
 ['4','nepali',Array.from({length:15},(_,i)=>18+i),Array(15).fill(6)],
 ['5','nepali',Array.from({length:15},(_,i)=>33+i),Array(15).fill(6)],
 ['4','english',Array.from({length:16},(_,i)=>48+i),[7,5,4,5,5,4,5,4,4,5,4,4,4,4,5,4]],
 ['5','english',Array.from({length:17},(_,i)=>64+i),[7,6,5,6,4,5,4,4,5,4,5,4,5,5,5,4,5]],
 ['4','mathematics',[81,82,83,84,85],[4,11,10,3,2]],
 ['5','mathematics',[86,87,89,90,91],[5,10,7,4,4]],
 ['4','socialstudies',[92,93,94,95,96,97,98],[4,5,5,3,4,5,6]],
 ['5','socialstudies',[99,100,101,102,103,104,105],[4,5,5,4,3,5,6]],
 ['4','science',[106,107,108,109,110,111,113,114],[5,5,3,6,3,14,8,5]],
 ['5','science',[115,116,117,118,119,120,121,122],[6,6,4,3,3,10,13,4]]
];
for(const [grade,subject,pages,counts] of upperSourceCases){
 choice('summaryClass',grade);choice('summarySubject',subject);
 const rows=summaryRows(),num=v=>Number(v.replace(/[०-९]/g,d=>'०१२३४५६७८९'.indexOf(d)));
 assert.equal(rows.length,counts.length,grade+':'+subject);
 for(const [i,row] of rows.entries()){
  assert.equal(num(row.cells[2].textContent),counts[i],grade+':'+subject+':'+i);
  assert.equal(num(row.cells[3].textContent),counts[i]*4);
  assert.match(row.cells[4].textContent,/सङ्ख्या मिलेको|count matched/);
  assert.equal(row.cells[4].querySelector('a').href,field('guidePdf45').href.split('#')[0]+'#page='+pages[i]);
 }
 assert.equal(field('class').value,entryClassBefore);
 assert.equal(field('student').value,entryStudentBefore);
}
const coverage=[...field('themeCoverageRows').rows];
assert.equal(coverage.length,29);
const coverageRow=(grade,subject)=>coverage.find(row=>row.dataset.cdcCoverageClass===grade&&row.dataset.cdcCoverageSubject===subject);
assert.equal(coverageRow('1','serophero').cells[2].textContent,'१० / १०');
assert.equal(coverageRow('1','serophero').cells[3].textContent,'२५');
assert.equal(coverageRow('1','serophero').cells[4].textContent,'१०८');
assert.equal(coverageRow('2','serophero').cells[2].textContent,'१० / १०');
assert.equal(coverageRow('2','serophero').cells[3].textContent,'२८');
assert.equal(coverageRow('2','serophero').cells[4].textContent,'१४४');
assert.equal(coverageRow('3','serophero').cells[3].textContent,'२४');
assert.equal(coverageRow('3','serophero').cells[4].textContent,'१४०');
assert.equal(coverageRow('3','english').cells[4].textContent,'944');
assert.equal(coverageRow('5','mathematics').cells[3].textContent,'30');
assert.equal(coverageRow('5','mathematics').cells[4].textContent,'120');
assert.equal(coverageRow('5','hamrodhunibeshi').cells[2].textContent,'—');
assert.match(field('themeCoverageInfo').textContent,/243 \/ 243.*5/);
for(const row of coverage){
 const toNumber=v=>Number(v.replace(/[०-९]/g,d=>'०१२३४५६७८९'.indexOf(d)));
 if(row.cells[3].textContent==='—'){assert.equal(row.cells[4].textContent,'—');continue;}
 if(row.dataset.cdcCoverageSubject==='serophero'&&['1','2','3'].includes(row.dataset.cdcCoverageClass))continue;
 assert.equal(toNumber(row.cells[4].textContent),4*toNumber(row.cells[3].textContent));
}

choice('summaryClass','1');choice('summarySubject','serophero');
const seroSummary=summaryRows().find(row=>row.cells[1]?.textContent==='म र मेरो परिवार');
assert.equal(seroSummary.cells[2].textContent,'५');
assert.equal(seroSummary.cells[3].textContent,'२०');
assert.equal(seroSummary.cells[4].textContent,'२०');
assert.deepEqual(summaryRows().map(row=>Number(row.querySelector('a').href.split('#page=')[1])),[128,129,130,131,132,132,133,133,134,134]);
assert.equal(summaryRows().find(row=>row.cells[1]?.textContent==='हाम्रो संस्कृति').cells[3].textContent,'४');
for(const [theme,count,full,indicators] of [['हाम्रो विद्यालय','२','१२','१२'],['हाम्रा वरपरका जीवजन्तु','२','८','८'],['हाम्रो वातावरण','२','८','८'],['मेरो सिर्जना','२','१२','१२'],['हाम्रो संस्कृति','१','४','४'],['सञ्चार प्रविधि र बजार','२','८','८'],['हाम्रो वरपरको संसार','२','८','८']]){
 const row=summaryRows().find(row=>row.cells[1]?.textContent===theme);
 assert.equal(row.cells[2].textContent,count);
 assert.equal(row.cells[3].textContent,full);
 assert.equal(row.cells[4].textContent,indicators);
 assert.match(row.cells[5].textContent,/गणना पुष्टि, प्रविष्टि बाँकी/);
}
assert.equal(field('themeSummaryFoot').rows[0].cells[1].textContent,'२५');
assert.equal(field('themeSummaryFoot').rows[0].cells[2].textContent,'१०८');
assert.equal(field('themeSummaryFoot').rows[0].cells[3].textContent,'१०८');
assert.equal(field('themeSummaryRows').rows.length,10);
assert.equal(field('seroCurriculumReference').hidden,false);
assert.match(field('seroCurriculumTotal').textContent,/कक्षा १.*२५/);
// Verified original 2076 guide, twenty theme count rows for 2083 only.
const verifiedSeroCounts={
 '2':[[6,24],[4,24],[3,24],[3,16],[2,8],[2,12],[2,12],[1,4],[2,8],[3,12]],
 '3':[[4,24],[3,16],[3,24],[3,16],[1,8],[2,8],[2,12],[1,8],[2,8],[3,16]]
};
for(const grade of ['2','3']){
 choice('summaryClass',grade);choice('summarySubject','serophero');
 assert.equal(field('seroCurriculumReference').hidden,false);
 assert.match(field('seroCurriculumTotal').textContent,/२५/);
 const rows=summaryRows(),expected=verifiedSeroCounts[grade];
 assert.equal(rows.length,10);
 assert.equal(new Set(rows.map(row=>row.cells[1].textContent.trim())).size,10);
 const n=v=>Number(v.replace(/[०-९]/g,d=>'०१२३४५६७८९'.indexOf(d)));
 for(const [i,row] of rows.entries()){
  assert.equal(n(row.cells[2].textContent),expected[i][0]);
  assert.equal(n(row.cells[3].textContent),expected[i][1]);
  assert.equal(n(row.cells[4].textContent),expected[i][1]);
  assert.match(row.cells[5].textContent,/गणना पुष्टि, प्रविष्टि बाँकी/);
 }
 const foot=field('themeSummaryFoot').rows[0];
 assert.equal(n(foot.cells[1].textContent),grade==='2'?28:24);
 assert.equal(n(foot.cells[2].textContent),grade==='2'?144:140);
 assert.equal(n(foot.cells[3].textContent),grade==='2'?144:140);
 assert.equal(coverageRow(grade,'serophero').cells[2].textContent,'१० / १०');
 assert.equal(field('class').value,entryClassBefore);
 assert.equal(field('subject').value,entrySubjectBefore);
 assert.equal(field('student').value,entryStudentBefore);
}
choice('summaryClass','1');choice('summarySubject','english');
assert.equal(field('seroCurriculumReference').hidden,true);
for(const grade of ['1','2','3','4','5']){
 choice('summaryClass',grade);choice('summarySubject','english');
 const rows=summaryRows();
 assert.ok(rows.length>0);
 for(const row of rows){
  assert.equal(Number(row.cells[3].textContent),4*Number(row.cells[2].textContent));
  assert.doesNotMatch(row.textContent,/[\u0900-\u097f]/);
 }
 assert.equal(rows.length,({'1':11,'2':10,'3':10,'4':16,'5':17})[grade]);
}
choice('summaryClass','4');choice('summarySubject','english');
assert.equal(summaryRows().find(row=>row.cells[1]?.textContent==='Unit 7: Locations').cells[3].textContent,'20');
choice('summaryClass','5');choice('summarySubject','hamrodhunibeshi');
assert.match(field('themeSummaryRows').textContent,/Source catalogue is not yet available/);
assert.equal(field('class').value,entryClassBefore);
assert.equal(field('subject').value,entrySubjectBefore);
assert.equal(field('student').value,entryStudentBefore);
const beforeSero=observations.size;
for(const [unit,count,groups] of [['म र मेरो परिवार',20,5],['मेरो दैनिक जीवन',16,4],['हाम्रो समुदाय',12,3]]){
 choice('unit',unit);
 assert.equal(field('annex3').hidden,false,unit);
 assert.equal(field('annexRows').rows.length,count,unit);
 assert.equal(field('annexRows').rows[0].cells[0].rowSpan,count);
 assert.equal(field('annexRows').rows[0].cells[1].rowSpan,4);
 assert.equal([...field('annexRows').rows].filter(row=>row.cells.length>=9).length,groups);
 assert.match(field('annexHead').textContent,/सकेको \/ नसकेको/);
 assert.equal(field('gridRead').hidden,false);
 assert.equal(field('annexRows').querySelectorAll('[data-cdc-sero-save]').length,0);
 assert.equal(field('printForm').disabled,true);
 assert.equal(field('annexRows').querySelectorAll('[data-cdc-grid-edit]').length,0);
 assert.match(field('annexStatus').textContent,/समीक्षा प्रति/);
 const regular=[...field('annexRows').querySelectorAll('[data-cdc-sero-indicator="0"]')];
 const remedial=[...field('annexRows').querySelectorAll('[data-cdc-sero-indicator="1"]')];
 const scores=[...field('annexRows').querySelectorAll('[data-cdc-sero-score="0"]')];
 const supportScores=[...field('annexRows').querySelectorAll('[data-cdc-sero-score="1"]')];
 assert.equal(regular.length,count);assert.equal(remedial.length,count);
 assert.equal(scores.length,groups);assert.equal(supportScores.length,groups);
 assert.equal(scores[0].textContent,'—');
 for(let i=0;i<3;i++){regular[i].value='yes';regular[i].onchange();}
 assert.equal(scores[0].textContent,'—');
 regular[3].value='no';regular[3].onchange();
 assert.equal(scores[0].textContent,'३');
 assert.match(field('annexFoot').textContent,/पूरा: १/);
 remedial[0].value='yes';remedial[0].onchange();
 assert.equal(supportScores[0].textContent,'—');
 assert.match(field('annexFoot').textContent,/पूरा: ०/);
 for(let i=1;i<4;i++){remedial[i].value='yes';remedial[i].onchange();}
 assert.equal(supportScores[0].textContent,'४');
 for(let i=4;i<regular.length;i++){regular[i].value='no';regular[i].onchange();}
 assert.equal(scores[1].textContent,'०');
 assert.match(field('annexFoot').textContent,new RegExp('पूरा: '+String(groups).replace(/[0-9]/g,d=>'०१२३४५६७८९'[Number(d)])));
 assert.equal(field('printForm').disabled,true);
}
assert.equal(observations.size,beforeSero);
const binaryRecords=new Map(),originalDoc=w.doc,originalSetDoc=w.setDoc,originalRead=w.getDocsFromServer,originalGetDoc=w.getDocFromServer;
w.doc=(base,name,id)=>base==='cdc_serofero_indicators'?{path:base+'/'+(name??++nextId)}:originalDoc(base,name,id);
w.setDoc=async(ref,data)=>{
 if(!ref.path.startsWith('cdc_serofero_indicators/'))return originalSetDoc(ref,data);
 if(binaryRecords.has(ref.path))throw Error('immutable');
 binaryRecords.set(ref.path,data);
};
w.getDocFromServer=async ref=>ref.path.startsWith('cdc_serofero_indicators/')?{data:()=>binaryRecords.get(ref.path)}:originalGetDoc(ref);
w.getDocsFromServer=async args=>{
 if(args.name!=='cdc_serofero_indicators')return originalRead(args);
 const filters=Object.fromEntries(args.filters.map(([k,op,v])=>{assert.equal(op,'==');return [k,v];}));
 assert.deepEqual(filters,{studentId:'sero-1',className:'Class 1',subject:field('subject').value,section:'A',academicYear:'2083',period:field('period').value,unit:field('unit').value});
 return {docs:[...binaryRecords.values()].filter(record=>Object.entries(filters).every(([k,v])=>record[k]===v)).map(record=>({data:()=>record}))};
};
choice('unit','म र मेरो परिवार');
const preview=field('seroSourcePreview'),previewFrame=field('seroSourceFrame');
assert.equal(preview.hidden,false);
assert.equal(previewFrame.children.length,0);
assert.ok(field('seroSourceOpen').href.endsWith('#page=128'));
preview.open=true;preview.dispatchEvent(new w.Event('toggle'));
assert.equal(previewFrame.children.length,1);
assert.equal(previewFrame.firstChild.src,field('seroSourceOpen').href);
assert.equal(previewFrame.firstChild.referrerPolicy,'no-referrer');
assert.doesNotMatch(previewFrame.firstChild.src,/sero-1|studentId|academicYear/);
choice('unit','मेरो दैनिक जीवन');
assert.equal(preview.open,false);
assert.equal(previewFrame.children.length,0);
assert.ok(field('seroSourceOpen').href.endsWith('#page=129'));
choice('unit','म र मेरो परिवार');
await field('gridRead').onclick();
const seroControls=(name,stage=0)=>[...field('annexRows').querySelectorAll('[data-cdc-sero-'+name+'="'+stage+'"]')];
assert.equal(seroControls('save').length,5);
assert.equal(seroControls('use-suggested').length,20);
assert.equal(seroControls('used-tool')[0].value,'');
seroControls('use-suggested')[0].onclick();
assert.ok(seroControls('used-tool')[0].value.length>0);
assert.equal(seroControls('used-tool',1)[0].value,'');
assert.equal(binaryRecords.size,0);
seroControls('used-tool')[0].value='';
const fill=(stage,values,date='2083-08-07')=>{
 values.forEach((v,i)=>{const select=seroControls('indicator',stage)[i];select.value=v;select.onchange();});
 seroControls('date',stage)[0].value=date;
};
fill(0,['yes','no','yes','']);
await seroControls('save')[0].onclick();assert.equal(binaryRecords.size,0);
fill(0,['yes','no','yes','no'],'2083-13-01');
await seroControls('save')[0].onclick();assert.equal(binaryRecords.size,0);
fill(0,['yes','no','yes','no']);
await seroControls('save')[0].onclick();assert.equal(binaryRecords.size,1);
assert.equal(JSON.stringify([...binaryRecords.values()][0].indicators),'[true,false,true,false]');
assert.equal([...binaryRecords.values()][0].outcomeId,'cdc2076-g1-1');
await seroControls('save')[0].onclick();assert.equal(binaryRecords.size,1);
fill(1,['yes','yes','yes','yes']);
assert.equal(seroControls('used-tool',1).length,20);
seroControls('used-tool',1)[0].value='परीक्षण साधन: समूह छलफल';
seroControls('used-tool',1)[1].value='परीक्षण साधन: चित्र अभ्यास';
await seroControls('save',1)[0].onclick();assert.equal(binaryRecords.size,2);
assert.equal(JSON.stringify([...binaryRecords.values()][1].usedTools),JSON.stringify(['परीक्षण साधन: समूह छलफल','परीक्षण साधन: चित्र अभ्यास','','']));
assert.equal('usedTools' in [...binaryRecords.values()][0],false);
await field('gridRead').onclick();
assert.equal(seroControls('score')[0].textContent,'२');
assert.equal(seroControls('score',1)[0].textContent,'४');
assert.equal(seroControls('date')[0].value,'2083-08-07');
assert.equal(seroControls('used-tool')[0].value,'');
assert.equal(seroControls('used-tool',1)[0].value,'परीक्षण साधन: समूह छलफल');
assert.equal(field('printForm').disabled,false);
let seroMarkup='',seroPrintCount=0;
w.open=()=>({document:{open(){},write(markup){seroMarkup=markup;},close(){}},focus(){},print(){seroPrintCount++;}});
fill(0,['no','no','no','no'],'2083-08-09');
seroControls('used-tool',1)[0].value='नसुरक्षित साधन';
assert.equal(seroControls('score')[0].textContent,'०');
field('printForm').onclick();
assert.equal(seroPrintCount,1);
const seroPrint=new JSDOM(seroMarkup).window.document;
assert.equal(seroPrint.documentElement.lang,'ne');
assert.equal(seroPrint.querySelectorAll('input,select,button').length,0);
assert.equal(seroPrint.querySelector('tbody').rows.length,20);
assert.match(seroPrint.querySelector('tbody').rows[0].textContent,/✓.*२०८३-०८-०७२/);
assert.doesNotMatch(seroPrint.body.textContent,/२०८३-०८-०९|नसुरक्षित साधन/);
assert.doesNotMatch(seroPrint.body.textContent,/सुझाइएको साधन प्रयोग/);
assert.match(seroPrint.body.textContent,/थप सहायता: परीक्षण साधन: समूह छलफल/);
assert.match(seroPrint.querySelector('tfoot').textContent,/सुरक्षित अभिलेख.*पूरा: १ \/ ५/);
assert.match(seroPrint.head.textContent,/A4 landscape/);
assert.equal(seroPrint.querySelector('tfoot').rows.length,2);
assert.equal(seroPrint.querySelector('tfoot').rows[1].cells[3].textContent,'—');
assert.equal(seroPrint.querySelector('tfoot').rows[1].cells[6].textContent,'—');
assert.equal(binaryRecords.size,2);
serverRole={...current,subjectAssignments:[]};
fill(0,['no','no','no','no']);
await seroControls('save')[0].onclick();assert.equal(binaryRecords.size,2);
serverRole={...current};
choice('unit','मेरो दैनिक जीवन');
assert.equal(field('printForm').disabled,true);
field('printForm').onclick();assert.equal(seroPrintCount,1);
await field('gridRead').onclick();assert.equal(seroControls('score')[0].textContent,'—');
assert.equal(field('printForm').disabled,false);
assert.equal(observations.size,beforeSero);
for(const [unit,count,page,mainCount] of [['हाम्रो विद्यालय',12,131,2],['हाम्रा वरपरका जीवजन्तु',8,132,2],['हाम्रो वातावरण',8,132,2],['मेरो सिर्जना',12,133,2],['हाम्रो संस्कृति',4,133,1],['सञ्चार प्रविधि र बजार',8,134,2],['हाम्रो वरपरको संसार',8,134,2]]){
 choice('unit',unit);
 assert.equal(field('annex3').hidden,false,unit);
 assert.equal(field('annexRows').rows.length,count,unit);
 assert.ok(seroControls('indicator').every(control=>control.disabled));
 assert.ok(seroControls('indicator',1).every(control=>control.disabled));
 assert.ok(seroControls('date').every(control=>control.disabled));
 assert.equal(seroControls('save').length,0);
 assert.equal(field('gridRead').hidden,true);
 assert.equal(field('printForm').disabled,true);
 assert.ok(field('annexStatus').querySelector('a').href.endsWith('#page='+page));
 assert.equal(field('annexRows').querySelectorAll('[data-cdc-guide-outcome]').length,mainCount);
 assert.equal(field('annexRows').querySelectorAll('[data-cdc-guide-block="0"]').length,count/4);
 assert.ok([...field('annexRows').rows].every(row=>!row.textContent.includes('मूल PDF हेर्नुहोस्')));
 assert.equal(field('annexFoot').querySelectorAll('[data-cdc-sero-stage-average]').length,2);
 await field('gridRead').onclick();
 field('printForm').onclick();
 assert.equal(seroPrintCount,1);
 assert.equal(binaryRecords.size,2);
}
// All twenty guide-layout previews: preserve main-outcome row spans and
// separately merged four-indicator date/score blocks. No record writes.
for(const grade of ['2','3']){
 current.subjectAssignments=[{className:'Class '+grade,subject:'serophero',section:'A'}];
 serverRole={...current};
 w.getDocs=async()=>({docs:[{id:'sero-review-'+grade,data:()=>({class:'Class '+grade,section:'A',name:'Synthetic Review Student'})}]});
 await w.loadCdcAssessmentPage();
 choice('summaryClass',grade);choice('summarySubject','serophero');
 const names=summaryRows().map(row=>row.cells[1].textContent);
 const expected=verifiedSeroCounts[grade];
 const pages=grade==='2'?[135,136,137,138,139,139,140,140,141,141]:[142,143,144,145,146,146,147,148,148,149];
 for(const [i,unit] of names.entries()){
  const summaryLink=summaryRows()[i].querySelector('a');
  assert.ok(summaryLink.href.endsWith('#page='+pages[i]));
  choice('unit',unit);
  const rows=field('annexRows'),outcomes=[...rows.querySelectorAll('[data-cdc-guide-outcome]')];
  assert.equal(field('annex3').hidden,false,unit);
  assert.equal(rows.rows.length,expected[i][1],unit);
  assert.equal(outcomes.length,expected[i][0],unit);
  assert.match(field('annexStatus').textContent,/कार्यगत शब्दावली/);
  assert.equal(field('annexStatus').textContent.includes('सूचक क्रम, साधन र अङ्कन खण्ड मूल PDF सँग जाँचिएको'),true,unit);
  if(grade==='2'&&i===0)assert.match(rows.textContent,/हपिङ गर्ने र रबरको रिङ फाल्ने/);
  assert.ok(outcomes.every(cell=>cell.textContent.includes(' — ')));
  assert.ok([...rows.rows].every(row=>!row.textContent.includes('मूल PDF हेर्नुहोस्')));
  const sampleLabels=grade==='2'
   ?[/छिमेकीलाई सम्मान गर्ने/,/चुम्बकबाट आकर्षित वस्तु छुट्याउने/,/स्थलचर जनावर चिन्ने/,/२५ मिटर दौड/,/सजीव–निर्जीव छुट्याउने/,/सार्वजनिक सम्पदा संरक्षण/,/स्थानीय गीत गाउने/,/राष्ट्रिय चिह्नको वर्णन/,/परिवारको आम्दानीका स्रोत/,/पानीका स्रोत/]
   :[/पारिवारिक नाता/,/ध्वनि प्रदूषणको असर/,/खोपको महत्त्व/,/प्राथमिक उपचारको अवधारणा/,/खाद्य शृङ्खलाको उदाहरण/,/ठोस, तरल र ग्यासका गुण परीक्षण/,/स्थानीय बाजा अभ्यास/,/स्थानीय भाषा/,/पैसा बचत/,/दिन र रातको कारण/];
  assert.match(rows.textContent,sampleLabels[i]);
  if(grade==='3'&&i===1)assert.match(rows.textContent,/चुम्बकीय र अचुम्बकीय वस्तु/);
  if(grade==='3'&&i===5){assert.match(rows.textContent,/कुहिने र नकुहिने फोहोर छुट्याएर उचित विसर्जन/);assert.match(rows.textContent,/अनुमान, अवलोकन र तर्क/);}
  if(grade==='3'&&i===9){assert.match(rows.textContent,/गतिशील पानीको शक्ति प्रयोगको व्याख्या र प्रदर्शन/);assert.match(rows.textContent,/गतिशील हावाको शक्ति प्रयोगको व्याख्या र प्रदर्शन/);}
  if(grade==='2'&&i===2){assert.match(rows.textContent,/अरूलाई पनि अवसर दिने/);assert.match(rows.textContent,/उफ्राइ र आवाजको अनुकरण/);}
  if(grade==='2'&&i===5)assert.match(rows.textContent,/डुब्ने वा तैरिने र घुल्ने वा नघुल्ने/);
  if(grade==='2'&&i===6)assert.match(rows.textContent,/लय, ताल, भाव र चाल मिलाएर सामूहिक नृत्य/);
  const toolLabels=[...rows.rows].map(row=>row.cells[row.cells.length-1].textContent.trim());
  if(grade==='3'&&i===1){
   assert.ok(toolLabels.every(t=>t===''));
   assert.ok([...rows.rows].every(row=>row.cells[row.cells.length-1].getAttribute('aria-label')==='मूल फाराममा खाली'));
  }else assert.ok(toolLabels.every(Boolean));
  const printed=grade==='2'
   ?[[1,2,3,4,5,5],[7,8,9,10],[11,12,13],[14,15,16],[17,18],[19,20],[21,22],[23],[24,25],[26,27,28]]
   :[[1,2,3,4],[5,6,7],[8,9,10],[11,12,13],[14],[15,16],[17,18],[19],[20,21],[22,23,24]];
  const ascii=v=>v.replace(/[०-९]/g,d=>String('०१२३४५६७८९'.indexOf(d)));
  assert.deepEqual(outcomes.map(cell=>Number(ascii(cell.textContent).match(/उपलब्धि (\d+)/)[1])),printed[i]);
  assert.equal(field('annexFoot').querySelectorAll('[data-cdc-sero-stage-average]').length,2);
  assert.equal(outcomes.reduce((n,cell)=>n+cell.rowSpan,0),expected[i][1]);
  assert.equal(rows.rows[0].cells[0].rowSpan,expected[i][1]);
  for(const stage of [0,1]){
   const blocks=[...rows.querySelectorAll('[data-cdc-guide-block="'+stage+'"]')];
   assert.equal(blocks.length,expected[i][1]/4);
   assert.ok(blocks.every(cell=>cell.rowSpan===4));
  }
  assert.ok(field('annexStatus').querySelector('a').href.endsWith('#page='+pages[i]));
  assert.equal(rows.querySelectorAll('input,select,button').length,0);
  assert.equal(field('gridRead').hidden,true);
  assert.equal(field('printForm').disabled,true);
  await field('gridRead').onclick();field('printForm').onclick();
  assert.equal(binaryRecords.size,2);
  assert.equal(observations.size,beforeSero);
  assert.equal(seroPrintCount,1);
 }
}
// Test-only approval injection: production approval set must remain empty.
assert.equal(w.__testSeroApproved.size,0);
// Check every pending original-guide form can be constructed with a unique,
// consecutive scoring ID without ever approving it in production.
const reviewNames=['म र मेरो परिवार','मेरो दैनिक जीवन','हाम्रो समुदाय','हाम्रो विद्यालय','हाम्रा वरपरका जीवजन्तु','हाम्रो वातावरण','मेरो सिर्जना','हाम्रो संस्कृति','सञ्चार प्रविधि र बजार','हाम्रो वरपरको संसार'];
const expectedByGrade={
 '1':[20,16,12,12,8,8,12,4,8,8],
 '2':[24,24,24,16,8,12,12,4,8,12],
 '3':[24,16,24,16,8,8,12,8,8,16]
};
for(const grade of ['1','2','3']){
 let next=1;
 for(const [i,unit] of reviewNames.entries()){
  const blocks=expectedByGrade[grade][i]/4;
  const key=grade+':'+unit;
  assert.equal(w.__testSeroEntryForm(grade,unit,'2083'),null);
  if(grade==='1'&&i<3){next+=blocks;continue;}
  w.__testSeroApproved.add(key);
  try{
   const form=w.__testSeroEntryForm(grade,unit,'2083');
   assert.ok(form,key);
   assert.equal(form.start,next,key);
   assert.equal(form.groups.length,blocks,key);
   assert.ok(form.groups.every(g=>g[1].length===4&&g[2].length===4),key);
   assert.equal(form.mainRows.filter(row=>row.first).reduce((sum,row)=>sum+row.span,0),blocks*4,key);
   assert.equal(w.__testSeroEntryForm(grade,unit,'2084'),null);
  }finally{w.__testSeroApproved.delete(key);}
  next+=blocks;
 }
 assert.equal(next-1,({'1':27,'2':36,'3':35})[grade]);
}
assert.equal(w.__testSeroApproved.size,0);
const unitUnderTest='मेरो दैनिक जीवन';
const keyUnderTest='2:'+unitUnderTest;
assert.equal(w.__testSeroEntryForm('2',unitUnderTest,'2083'),null);
w.__testSeroApproved.add(keyUnderTest);
const prepared=w.__testSeroEntryForm('2',unitUnderTest,'2083');
assert.equal(prepared.start,7);
assert.equal(prepared.groups.length,6);
assert.deepEqual(Array.from(prepared.mainRows,r=>r.span),[4,8,8,8,8,4]);
assert.deepEqual(Array.from(prepared.mainRows,r=>r.first),[true,true,false,true,false,true]);
assert.deepEqual(Array.from(prepared.mainRows,r=>r.index),[7,8,8,9,9,10]);
assert.equal(w.__testSeroEntryForm('2',unitUnderTest,'2084'),null);
current.subjectAssignments=[{className:'Class 2',subject:'serophero',section:'A'}];
serverRole={...current};
w.getDocs=async()=>({docs:[{id:'sero-review-2',data:()=>({class:'Class 2',section:'A',name:'Synthetic Review Student'})}]});
const priorBinaryRead=w.getDocsFromServer;
w.getDocsFromServer=async args=>{
 if(args.name!=='cdc_serofero_indicators')return priorBinaryRead(args);
 const filters=Object.fromEntries(args.filters.map(([k,op,v])=>{assert.equal(op,'==');return [k,v];}));
 assert.deepEqual(filters,{studentId:'sero-review-2',className:'Class 2',subject:field('subject').value,section:'A',academicYear:'2083',period:field('period').value,unit:unitUnderTest});
 return {docs:[...binaryRecords.values()].filter(record=>Object.entries(filters).every(([k,v])=>record[k]===v)).map(record=>({data:()=>record}))};
};
await w.loadCdcAssessmentPage();
choice('unit',unitUnderTest);
assert.equal(field('annexRows').rows.length,24);
assert.equal(field('annexRows').rows[4].cells[0].rowSpan,8);
assert.equal(seroControls('score').length,6);
assert.equal(seroControls('save').length,0);
await field('gridRead').onclick();
assert.equal(seroControls('save').length,6);
for(let i=8;i<12;i++){const control=seroControls('indicator')[i];control.value=i===8?'no':'yes';control.onchange();}
seroControls('date')[2].value='2083-08-07';
await seroControls('save')[2].onclick();
assert.equal(binaryRecords.size,3);
const newRecord=[...binaryRecords.values()].at(-1);
assert.equal(newRecord.outcomeId,'cdc2076-g2-9');
assert.equal(JSON.stringify(newRecord.indicators),'[false,true,true,true]');
await field('gridRead').onclick();
assert.equal(seroControls('score')[2].textContent,'३');
assert.equal(seroControls('score')[1].textContent,'—');
const averages=field('annexFoot').querySelectorAll('[data-cdc-sero-stage-average]');
assert.equal(averages[0].cellIndex,3);assert.equal(averages[1].cellIndex,6);
assert.equal([...averages[0].parentNode.cells].reduce((n,cell)=>n+cell.colSpan,0),10);
for(const control of seroControls('indicator')){control.value='yes';control.onchange();}
assert.equal(averages[0].textContent,'४.००');assert.equal(averages[1].textContent,'—');
field('printForm').onclick();
assert.equal(seroPrintCount,2);
const multiPrint=new JSDOM(seroMarkup).window.document;
assert.equal(multiPrint.querySelector('tbody').rows.length,24);
assert.equal(multiPrint.querySelector('tbody').rows[4].cells[0].rowSpan,8);
assert.equal(multiPrint.querySelectorAll('input,select,button').length,0);
assert.match(multiPrint.querySelector('tfoot').textContent,/पूरा: १ \/ ६/);
assert.equal(multiPrint.querySelector('tfoot').rows.length,2);
assert.equal(multiPrint.querySelector('tfoot').rows[1].cells[3].textContent,'—');
assert.equal(multiPrint.querySelector('tfoot').rows[1].cells[6].textContent,'—');
assert.equal(observations.size,beforeSero);
w.__testSeroApproved.delete(keyUnderTest);
w.getDocsFromServer=priorBinaryRead;
assert.equal(w.__testSeroApproved.size,0);
// Full DOM cycle for all pending forms, using only the in-memory backend.
// Source approval and Firestore production rules are NOT changed here.
let checkedForms=0,checkedBlocks=0;
for(const grade of ['1','2','3']){
 const studentId='sero-cycle-'+grade,className='Class '+grade;
 current.subjectAssignments=[{className,subject:'serophero',section:'A'}];
 serverRole={...current};
 w.getDocs=async()=>({docs:[{id:studentId,data:()=>({class:className,section:'A',name:'Synthetic Cycle Student'})}]});
 w.getDocsFromServer=async args=>{
  if(args.name!=='cdc_serofero_indicators')return priorBinaryRead(args);
  const filters=Object.fromEntries(args.filters.map(([k,op,v])=>{assert.equal(op,'==');return [k,v];}));
  assert.deepEqual(filters,{studentId,className,subject:field('subject').value,section:'A',academicYear:'2083',period:field('period').value,unit:field('unit').value});
  return {docs:[...binaryRecords.values()].filter(record=>Object.entries(filters).every(([k,v])=>record[k]===v)).map(record=>({data:()=>record}))};
 };
 for(const [i,unit] of reviewNames.entries()){
  if(grade==='1'&&i<3)continue;
  const approval=grade+':'+unit,blocks=expectedByGrade[grade][i]/4;
  w.__testSeroApproved.add(approval);
  try{
   await w.loadCdcAssessmentPage();
   choice('unit',unit);
   assert.equal(field('annexRows').rows.length,blocks*4,approval);
   assert.equal(seroControls('save').length,0,approval);
   await field('gridRead').onclick();
   const prepared=w.__testSeroEntryForm(grade,unit,'2083');
   assert.equal(seroControls('save').length,blocks,approval);
   const before=binaryRecords.size;
   // All blocks in both stages get synthetic data. This tests zero and
   // maximum scores without touching a real student or Firebase.
   for(const stage of [0,1]){
    for(let k=0;k<blocks;k++){
     for(let j=0;j<4;j++){
      const input=seroControls('indicator',stage)[4*k+j];
      input.value=stage?'yes':'no';input.onchange();
     }
     seroControls('date',stage)[k].value='2083-08-07';
     seroControls('used-tool',stage)[k*4].value='परीक्षण साधन '+stage+'-'+k;
     await seroControls('save',stage)[k].onclick();
     const saved=[...binaryRecords.values()].at(-1);
     assert.equal(saved.outcomeId,'cdc2076-g'+grade+'-'+(prepared.start+k),approval);
     assert.equal(saved.stage,stage?'support':'regular');
     assert.equal(saved.studentId,studentId);
    }
   }
   assert.equal(binaryRecords.size,before+2*blocks,approval);
   await field('gridRead').onclick();
   assert.ok(seroControls('score',0).every(cell=>cell.textContent==='०'),approval);
   assert.ok(seroControls('score',1).every(cell=>cell.textContent==='४'),approval);
   const stageCells=field('annexFoot').querySelectorAll('[data-cdc-sero-stage-average]');
   assert.equal(stageCells[0].textContent,'०.००');assert.equal(stageCells[1].textContent,'४.००');
   assert.equal(seroControls('used-tool',1)[0].value,'परीक्षण साधन 1-0');
   seroControls('used-tool',1)[0].value='नसुरक्षित साधन';
   const beforePrint=seroPrintCount;
   field('printForm').onclick();
   assert.equal(seroPrintCount,beforePrint+1,approval);
   const printed=new JSDOM(seroMarkup).window.document;
   assert.equal(printed.querySelector('tbody').rows.length,blocks*4,approval);
   assert.equal(printed.querySelectorAll('input,select,button').length,0);
   assert.equal(printed.querySelector('tfoot').rows[1].cells[3].textContent,'०.००');
   assert.equal(printed.querySelector('tfoot').rows[1].cells[6].textContent,'४.००');
   assert.match(printed.body.textContent,/परीक्षण साधन 1-0/);
   assert.doesNotMatch(printed.body.textContent,/नसुरक्षित साधन/);
   assert.equal(observations.size,beforeSero);
   checkedForms++;checkedBlocks+=blocks;
  }finally{w.__testSeroApproved.delete(approval);}
 }
}
assert.equal(checkedForms,27);
assert.equal(checkedBlocks,86);
assert.equal(w.__testSeroApproved.size,0);
w.getDocsFromServer=priorBinaryRead;
console.log('All 27 pending original-guide forms: 86 blocks in both stages, zero/max scores, scoped in-memory Save/Load and saved-only print');
current.subjectAssignments=[{className:'Class 1',subject:'serophero',section:'A'}];
serverRole={...current};
w.getDocs=async()=>({docs:[{id:'sero-1',data:()=>({class:'Class 1',section:'A',name:'Synthetic Student'})}]});
w.currentSchoolSettings.academicYear='2084';
await w.loadCdcAssessmentPage();
for(const grade of ['2','3']){
 choice('summaryClass',grade);choice('summarySubject','serophero');
 assert.equal(field('seroCurriculumReference').hidden,true);
 assert.equal(summaryRows().length,10);
 assert.ok(summaryRows().every(row=>row.cells[2].textContent==='—'&&row.cells[3].textContent==='—'));
}
choice('unit','म र मेरो परिवार');
assert.equal(field('annex3').hidden,true);
assert.equal(field('seroSourcePreview').hidden,true);
assert.equal(field('seroSourceFrame').children.length,0);
console.log('Grade 1 Our Surroundings three forms, 48 indicators, scoped binary Save/Load, saved-only print, seven original-guide review forms, duplicate and revoked-role checks passed');
dom.window.close();
console.log('CDC form: bilingual lookup, editable Nepali date, progress, shared save/retry/read, stale results and revoked assignment passed');
