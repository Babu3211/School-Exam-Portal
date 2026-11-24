import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cdcSubjectKey,findCdcGridSources,grade9RequiredPaperLanguage} from '../cdc-grid-source-index.mjs';
const register=JSON.parse(readFileSync(new URL(
 '../data/cdc-question-paper-sources-2083.json',import.meta.url),'utf8'));
const examples=[
 [6,'Social Studies and Human Values','social'],
 [6,'सामाजिक अध्ययन तथा मानव मूल्य शिक्षा','social'],
 [7,'गणित','math'],
 [8,'Science and Technology','science'],
 [8,'अङ्ग्रेजी','english'],
 [9,'Compulsory Mathematics','math'],
 [9,'अनिवार्य नेपाली','nepali'],
 [9,'Optional Mathematics','optional_math'],
 [9,'ऐच्छिक गणित','optional_math'],
 [9,'ऐच्छिक कम्प्युटर विज्ञान','optional_computer'],
 [10,'Optional Computer Science','optional_computer'],
 [10,'ऐच्छिक अर्थशास्त्र','optional_economics'],

];
for(const [grade,subject,key] of examples){
 assert.equal(cdcSubjectKey(subject),key,subject+' maps to CDC subject');
 const sources=findCdcGridSources(register,grade,subject);
 assert.ok(sources.length,'No registered official CDC grid source for '+grade+' '+subject);
 assert.ok(sources.every(x=>x.grade===grade&&x.subjectKey===key&&
  x.sourceOnly===true&&x.verifiedGridRows===false),
  'Source reference must not claim a transcribed/approved Grid');
 assert.equal(new Set(sources.map(x=>x.sourceUrl)).size,sources.length);
 assert.ok(sources.every(x=>/^https:\/\/(?:www\.|lib\.)?moecdc\.gov\.np\/|^https:\/\/giwmscdnone\.gov\.np\//i.test(x.sourceUrl)));
}
assert.equal(cdcSubjectKey('Health and Physical Education'),'health');
for(const s of ['Optional I: Environmental Science','ऐच्छिक प्रथम: वातावरण विज्ञान']){
 assert.equal(cdcSubjectKey(s),'optional_environment');
 assert.ok(findCdcGridSources(register,9,s).every(x=>x.subjectKey==='optional_environment'),'No compulsory Science grid reuse');
}
assert.equal(cdcSubjectKey('Optional I: Additional Mathematics'),'optional_math');
assert.equal(cdcSubjectKey('ऐच्छिक प्रथम: अतिरिक्त गणित'),'optional_math');
assert.deepEqual(findCdcGridSources(register,10,'Health and Physical Education'),[],
 'The official health curriculum is NOT a specification Grid; do not label it as such');
for(const grade of [9,10]){
 const computer=findCdcGridSources(register,grade,'Optional Computer Science');
 assert.ok(computer.some(x=>x.sourceUrl.startsWith('https://giwmscdnone.gov.np/')),
  'Must include official government CDC PDF CDN for computer');
 assert.ok(!computer.some(x=>x.title.includes('ऐच्छिक गणित')));
 const math=findCdcGridSources(register,grade,'Optional Mathematics');
 assert.ok(math.some(x=>x.sourceUrl.includes('Opt.%20Math')),
  'Official optional Math source must be found');
 assert.ok(!math.some(x=>/Computer|कम्प्युटर/.test(x.title)));
 assert.ok(!findCdcGridSources(register,grade,'Mathematics').some(
  x=>/ऐच्छिक गणित|Optional Mathematics/.test(x.title)),
  'Compulsory maths must never inherit optional maths grid');
}
for(const grade of [6,7,8]){
 assert.equal(findCdcGridSources(register,grade,'Optional Computer Science').length,0,
  'Do not reuse Grade 9/10 Computer Science grid in lower grades');
}
assert.deepEqual(findCdcGridSources(register,11,'Science and Technology'),[]);
assert.deepEqual(findCdcGridSources(register,8,''),[]);
assert.deepEqual(findCdcGridSources({},8,'Science'),[]);
const fake={sources:[
 {grades:[8],subject:'विज्ञान तथा प्रविधि',kind:'specification_grid',
  url:'https://unsafe.example/cdc-grid',version:'2083',status:'official_current'},
 {grades:[8],subject:'विज्ञान तथा प्रविधि',kind:'curriculum',
  url:'https://moecdc.gov.np/content/284/',status:'official'},
 {grades:[8],subject:'विज्ञान तथा प्रविधि',kind:'specification_grid',
  url:'https://moecdc.gov.np/content/284/',version:'2082',status:'official'}
]};
const found=findCdcGridSources(fake,8,'Science and Technology');
assert.deepEqual(found.map(x=>x.sourceUrl),['https://moecdc.gov.np/content/284/']);
console.log('PASS CDC source index for grades 6-10, Nepali and English subject aliases,');
console.log('official PDF CDN accepted, no class/optional subject leaks, no fake approved grids');

const retrieved=register.sources.filter(s=>s.retrievalEvidence?.runId===45387109761);
assert.equal(retrieved.length,5);
assert.deepEqual(retrieved.map(s=>s.retrievalEvidence.resource).sort(),['11166','11167','11168','11169','11170']);
for(const s of retrieved){
 const e=s.retrievalEvidence;
 assert.match(e.sha256,/^[a-f0-9]{64}$/);
 assert.ok(e.pages>0&&e.byteCount>0);
 assert.equal(e.currentCdcExactApproved,false);
 assert.equal(e.verifiedGridRows,false);
 assert.ok(findCdcGridSources(register,9,s.subject).some(x=>x.sourceUrl===s.url&&x.sourceOnly&&!x.verifiedGridRows));
}
console.log('PASS five full government PDF retrieval fingerprints; source evidence only, no automatic approval');

assert.equal(cdcSubjectKey('Computer Science'),'optional_computer');
for(const subject of ['Nepali','नेपाली','Social Studies','सामाजिक अध्ययन','हाम्रो सेरोफेरो'])assert.equal(grade9RequiredPaperLanguage(9,subject),'ne');
for(const subject of ['Mathematics','Science and Technology','Optional Mathematics','Computer Science','Environmental Science','Economics'])assert.equal(grade9RequiredPaperLanguage(9,subject),'both');
assert.equal(grade9RequiredPaperLanguage(9,'English'),'en');
assert.equal(grade9RequiredPaperLanguage(10,'Social Studies'),null);
assert.equal(grade9RequiredPaperLanguage(9,''),null);
console.log('PASS Grade 9 school language policy and existing grades preserved');

const {grade9GridLibrary}=await import('../cdc-grade9-grid-library.mjs');
const library=grade9GridLibrary(register);
assert.equal(library.length,11);
assert.ok(library.every(x=>!x.currentCdcExactApproved&&!x.readyForLive));
const byKey=Object.fromEntries(library.map(x=>[x.key,x]));
assert.equal(byKey.optional_math.tables[1].rows.length,6);
assert.equal(byKey.optional_math.tables[1].rows.reduce((n,r)=>n+r[4],0),75);
assert.equal(byKey.optional_computer.tables[0].rows.reduce((n,r)=>n+r[5],0),50);
assert.equal(byKey.nepali.tables[0].rows.reduce((n,r)=>n+r[1],0),75);
assert.equal(byKey.optional_environment.sources.every(s=>s.kind==='curriculum'),true);
assert.equal(byKey.optional_economics.tables.length,0);
assert.ok(library.every(x=>x.sources.every(s=>!s.url.includes('unsafe.example'))));
assert.ok(grade9GridLibrary({sources:[{grades:[9],subject:'Nepali',kind:'specification_grid',url:'https://unsafe.example/grid'}]}).every(x=>x.sources.length===0));
const portal=readFileSync(new URL('../cdc-question-paper.js',import.meta.url),'utf8');
assert.match(portal,/id="qpGrade9GridLibrary"/);
assert.match(portal,/renderGrade9GridLibrary\(\$\("qpGrade9GridLibraryContent"\),cdcSourceRegister\)/);
console.log('PASS read-only Class 9 Grid Library, all 8 school subjects plus 3 catalog subjects, no invented approval');
