import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareNewSubjectExamSettings} from './create-subject-exam-settings.mjs';
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const start=rules.indexOf('function validComponentList(items)');
const end=rules.indexOf('function validNewSettings()',start);
assert.ok(start>=0&&end>start);
const block=rules.slice(start,end);
assert.match(block,/items\.size\(\) >= 1 && items\.size\(\) <= 6/);
for(let i=0;i<6;i++)assert.match(block,new RegExp('validComponent\\(items\\['+i+'\\]\\)'));
let pairs=0;
for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){
 assert.ok(block.includes('(items.size() <= '+j+' || items['+i+'].key != items['+j+'].key)'),'Missing unique component key pair '+i+','+j);
 pairs++;
}
assert.equal(pairs,15);
const input={schoolId:'12345',classId:'9',subjectId:'computer',examId:'final',components:[{key:'theory',name:'Theory',fullMarks:36},{key:'theory',name:'Practical',fullMarks:64}]};
assert.throws(()=>prepareNewSubjectExamSettings(input),/duplicate|Duplicate|Invalid/);
console.log('V47 15 pairwise component-key uniqueness checks present in immutable settings rules; emulator still required');
