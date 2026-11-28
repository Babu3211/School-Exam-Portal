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
assert.throws(()=>prepareNewSubjectExamSettings({...settings,components:[...settings.components,...settings.components,...settings.components,...settings.components]}),/1–6|duplicate|Duplicate|Maximum|Invalid/);
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
let writes=0,alreadyExists=false,subjectActive=true,subjectSchool='12345',subjectClass='9';
const api={
 doc:(_db,...parts)=>parts.join('/'),
 runTransaction:async(_db,callback)=>callback({
  get:async(ref)=>{
   if(ref==='schools/12345/mark_settings/9_computer_final')return {exists:()=>alreadyExists};
   assert.equal(ref,'schools/12345/subjects/computer');
   return {exists:()=>subjectActive,data:()=>({schoolId:subjectSchool,class:subjectClass,active:subjectActive})};
  },
  set:(ref,data)=>{writes++;assert.equal(ref,'schools/12345/mark_settings/9_computer_final');assert.equal(data.id,settings.id)}
 })
};
const actor={role:'school_admin',active:true,schoolId:'12345',uid:'admin'};
await createNewSubjectExamSettings({db:{},api,actor,settings});
assert.equal(writes,1);
alreadyExists=true;
await assert.rejects(()=>createNewSubjectExamSettings({db:{},api,actor,settings}),/already exist/);
alreadyExists=false;
subjectActive=false;
await assert.rejects(()=>createNewSubjectExamSettings({db:{},api,actor,settings}),/not active/);
subjectActive=true;subjectSchool='87654';
await assert.rejects(()=>createNewSubjectExamSettings({db:{},api,actor,settings}),/not active/);
subjectSchool='12345';subjectClass='10';
await assert.rejects(()=>createNewSubjectExamSettings({db:{},api,actor,settings}),/not active/);
subjectClass='9';
assert.equal(writes,1);
await assert.rejects(()=>createNewSubjectExamSettings({db:{},api,actor:{...actor,role:'viewer'},settings}),/School Admin/);
assert.equal(writes,1);
console.log('V47 create-once subject examination settings contract tests passed (emulator still required)');

// Multi-term creation is atomic: all reads before any set, no overwrites.
{
 const seen=new Map(),written=[];let reads=0;
 const subject='schools/12345/subjects/computer';
 const multiApi={doc:(_db,...parts)=>parts.join('/'),runTransaction:async(_db,callback)=>{
  const pending=[];await callback({get:async ref=>{assert.equal(pending.length,0,'All reads must precede writes');reads++;return ref===subject?{exists:()=>true,data:()=>({schoolId:'12345',class:'9',active:true})}:{exists:()=>seen.has(ref)}},set:(ref,data)=>pending.push([ref,data])});
  for(const [ref,data] of pending){seen.set(ref,data);written.push(ref)}
 }};
 const created=await createNewSubjectExamSettings({db:{},api:multiApi,actor,settings,additionalTerms:['1st','2nd']});
 assert.equal(created.createdCount,3);assert.equal(reads,4);assert.equal(written.length,3);
 assert.deepEqual([...seen.values()].map(x=>x.examId),['final','1st','2nd']);
 assert.ok([...seen.values()].every(x=>JSON.stringify(x.components)===JSON.stringify(settings.components)));
 const third=prepareNewSubjectExamSettings({...settings,examId:'3rd'});
 await assert.rejects(createNewSubjectExamSettings({db:{},api:multiApi,actor,settings:third,additionalTerms:['weekly','1st']}),/already exist/);
 assert.equal(written.length,3);assert.equal(seen.has('schools/12345/mark_settings/9_computer_3rd'),false);
 await assert.rejects(createNewSubjectExamSettings({db:{},api:multiApi,actor,settings:third,additionalTerms:['3rd']}),/distinct/);
 await assert.rejects(createNewSubjectExamSettings({db:{},api:multiApi,actor:{...actor,role:'teacher'},settings:third,additionalTerms:['weekly']}),/School Admin/);
 assert.equal(written.length,3);
}

{
 const other=prepareNewSubjectExamSettings({...settings,subjectId:'math',components:[{key:'project',name:'Project',fullMarks:137.5}]});
 const docs=new Map(),writes=[];
 const batchApi={doc:(_db,...parts)=>parts.join('/'),runTransaction:async(_db,cb)=>{
  const pending=[];await cb({get:async path=>{assert.equal(pending.length,0);if(path.includes('/subjects/'))return {exists:()=>true,data:()=>({schoolId:'12345',class:'9',active:true})};return {exists:()=>docs.has(path)}},set:(p,d)=>pending.push([p,d])});
  for(const [p,d] of pending){docs.set(p,d);writes.push(p)}
 }};
 const result=await createNewSubjectExamSettings({db:{},api:batchApi,actor,settings,additionalSubjects:[other]});
 assert.equal(result.createdCount,2);assert.equal(docs.get('schools/12345/mark_settings/9_math_final').components[0].fullMarks,137.5);
 const weekly=prepareNewSubjectExamSettings({...settings,examId:'weekly'});
 await assert.rejects(createNewSubjectExamSettings({db:{},api:batchApi,actor,settings:weekly,additionalSubjects:[other]}),/scope mismatch/);
 await assert.rejects(createNewSubjectExamSettings({db:{},api:batchApi,actor,settings,additionalSubjects:[settings]}),/Duplicate batch/);
 const newSubject=prepareNewSubjectExamSettings({...settings,subjectId:'english'});
 await assert.rejects(createNewSubjectExamSettings({db:{},api:batchApi,actor,settings:newSubject,additionalSubjects:[other]}),/already exist/);
 assert.equal(writes.length,2);
}
console.log('PASS selected class Settings batch: original maxima, one-term scope and atomic no-overwrite');
