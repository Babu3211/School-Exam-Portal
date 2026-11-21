import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareNewSubjectExamSettings,createNewSubjectExamSettings} from './create-subject-exam-settings.mjs';
const settings=prepareNewSubjectExamSettings({schoolId:'12345',classId:'9',subjectId:'computer',examId:'final',components:[{key:'practical',name:'Practical',fullMarks:63},{key:'theory',name:'Theory',fullMarks:37}]});
assert.equal(settings.id,'9_computer_final');
for(const term of ['weekly','monthly','1st','2nd','3rd','final'])assert.equal(prepareNewSubjectExamSettings({...settings,examId:term}).examId,term);
assert.equal(settings.components[0].fullMarks,63);
assert.throws(()=>prepareNewSubjectExamSettings({...settings,components:[]}),/1–6/);
assert.throws(()=>prepareNewSubjectExamSettings({...settings,components:Array.from({length:7},(_,i)=>({key:'c'+i,name:'Component '+i,fullMarks:10}))}),/1–6/);
assert.throws(()=>prepareNewSubjectExamSettings({...settings,subjectId:'a'.repeat(128)}),/128 characters/);
assert.equal(prepareNewSubjectExamSettings({...settings,subjectId:'a'.repeat(119)}).id.length,127);
assert.throws(()=>prepareNewSubjectExamSettings({...settings,components:[...settings.components,...settings.components,...settings.components,...settings.components]}),/duplicate|Duplicate|Maximum|Invalid/);
assert.throws(()=>prepareNewSubjectExamSettings({...settings,schoolId:'abc'}));
assert.throws(()=>prepareNewSubjectExamSettings({...settings,examId:'unknown'}));
assert.throws(()=>prepareNewSubjectExamSettings({...settings,components:[{key:'x',name:'X',fullMarks:0}]}));
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const block=rules.slice(rules.indexOf('match /mark_settings/{id}'),rules.indexOf('match /{collection}/{id}',rules.indexOf('match /mark_settings/{id}')));
assert.match(block,/allow create: if memberRole\(sid, 'school_admin'\) && validNewSettings\(\)/);
assert.match(block,/allow update, delete: if false/);
assert.match(block,/id == d\.classId \+ '_' \+ d\.subjectId \+ '_' \+ d\.examId/);
assert.match(block,/id\.size\(\) <= 128/);
assert.match(block,/get\(subject\)\.data\.get\('active',false\) == true/);
let writes=0,alreadyExists=false;
const api={
 doc:(_db,...parts)=>parts.join('/'),
 runTransaction:async(_db,callback)=>callback({
  get:async(ref)=>{assert.equal(ref,'schools/12345/mark_settings/9_computer_final');return {exists:()=>alreadyExists}},
  set:(ref,data)=>{writes++;assert.equal(ref,'schools/12345/mark_settings/9_computer_final');assert.equal(data.id,settings.id)}
 })
};
const actor={role:'school_admin',active:true,schoolId:'12345',uid:'admin'};
await createNewSubjectExamSettings({db:{},api,actor,settings});
assert.equal(writes,1);
alreadyExists=true;
await assert.rejects(()=>createNewSubjectExamSettings({db:{},api,actor,settings}),/already exist/);
assert.equal(writes,1);
await assert.rejects(()=>createNewSubjectExamSettings({db:{},api,actor:{...actor,role:'viewer'},settings}),/School Admin/);
assert.equal(writes,1);
console.log('V47 create-once subject examination settings contract tests passed (emulator still required)');
