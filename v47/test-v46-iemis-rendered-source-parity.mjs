import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as rootEntry from '../iemis-entry.js';
import * as v47Entry from './iemis-entry.js';
import * as rootLedger from '../iemis-ledger.js';
import * as v47Ledger from './iemis-ledger.js';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const normalizeEntry=s=>s.replace(/^\/\/ V46 source:.*\n/gm,'')
 .replace(/^\/\/ V47 read-only parity copy, not a Firestore publication permission\.\n/gm,'')
 .replace(/\?v=20261115-class6-ledger/g,'').trimEnd();
const normalizeLedger=s=>s.replace(/^\/\/ V47 read-only parity copy of V46 iemis-ledger\.js.*\n/gm,'')
 .replace(/^\/\/ Keep calculations unchanged until explicit CDC\/IEMIS parity verification\.\n/gm,'').trimEnd();
assert.equal(normalizeEntry(read('../iemis-entry.js')),normalizeEntry(read('./iemis-entry.js')),
 'V46 Entry Grid changed: V47 source must be reviewed before replacing the verified copy');
assert.equal(normalizeLedger(read('../iemis-ledger.js')),normalizeLedger(read('./iemis-ledger.js')),
 'V46 IEMIS grade formula or ledger changed: block V47 parity regression');
assert.equal(normalizeLedger(read('./v46-iemis-ledger.js')),normalizeLedger(read('./iemis-ledger.js')),
 'Pinned original V46 IEMIS ledger differs from V47 calculation copy');

const students=[
 {id:'st1',nameEnglish:'Student <One>',studentIemisNo:'00017',symbolNo:'S01',schoolId:'300160003'},
 {id:'st2',nameEnglish:'Student Two',symbolNo:'S02',schoolId:'300160003'}
];
const terms=['first','second','annual'];
let cases=0;
for(let classNo=1;classNo<=10;classNo++)for(const term of terms){
 const annual=term==='annual',subjects=['Computer Science','English','Mathematics'];
 const sourceRecords=[];
 for(const student of students)for(const subject of subjects){
  const schema=rootEntry.iemisEntrySchema(classNo,term,subject);
  const values=schema[0].key==='count'?{count:'10',obtained:student.id==='st1'?'35':'30'}:
   Object.fromEntries(schema.filter(c=>!c.readonly).map(c=>[c.key,String(student.id==='st1'?c.max:Math.floor(c.max*.75))]));
  const draft={values,isAbsent:false};
  const oldRecord=rootEntry.iemisEntryValues(schema,draft);
  const newRecord=v47Entry.iemisEntryValues(v47Entry.iemisEntrySchema(classNo,term,subject),draft);
  assert.deepEqual(newRecord,oldRecord,'V46-V47 component scores drift at '+classNo+'/'+term+'/'+subject);
  sourceRecords.push({...oldRecord,schoolId:'300160003',studentId:student.id,subject,examId:term});
 }
 for(const mode of ['number','entry','grade']){
  const input={mode,classNo,annual,academicYear:'2083',term,subjects,students,
   records:sourceRecords,examId:term,schoolName:'School <Test>',schoolCode:'300160003',
   creditFor:()=>4,componentsFor:subject=>rootEntry.iemisEntrySchema(classNo,term,subject)};
  const oldResult=rootLedger.iemisLedger(input),newResult=v47Ledger.iemisLedger(input);
  assert.deepEqual(newResult,oldResult,
   'V46-V47 ledger output changed for class '+classNo+', '+term+', '+mode);
  assert.match(newResult.body,/Student &lt;One&gt;/,'IEMIS student names must be HTML-escaped');
  assert.doesNotMatch(newResult.body,/Student <One>/);
  cases++;
 }
}
for(const pct of [0,34.99,35,40,50,60,70,80,90,100]){
 assert.deepEqual(v47Ledger.iemisGrade(pct),rootLedger.iemisGrade(pct));
}
for(const point of [0,1.6,2,2.4,2.8,3.2,3.6,4]){
 assert.deepEqual(v47Ledger.iemisFinalGrade(point),rootLedger.iemisFinalGrade(point));
}
console.log('PASS V46 source-locked Grade/Ledger/Entry formula and HTML parity, '+cases+' class-term-mode cases; no marks writes');
