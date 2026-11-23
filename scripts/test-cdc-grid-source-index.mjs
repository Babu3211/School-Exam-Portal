import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cdcSubjectKey,findCdcGridSources} from '../cdc-grid-source-index.mjs';
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
