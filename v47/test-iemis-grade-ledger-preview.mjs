import assert from 'node:assert/strict';
import {previewIemisGradeLedger} from './iemis-grade-ledger-preview.mjs';
import {iemisEntrySchema} from '../iemis-entry.js';
import {iemisGpa} from '../iemis-ledger.js';
const students=[{id:'s1',nameEnglish:'Alpha'},{id:'s2',nameEnglish:'Beta'}];
const subjects=[{id:'eng',name:'English',creditHour:4},{id:'math',name:'Mathematics',creditHour:5}];
for(const classNo of ['1','5','6','9','10'])for(const [term,v46term] of [['1st','first'],['final','annual']]){
 const draftsBySubject={};
 for(const subject of subjects){
  const schema=iemisEntrySchema(classNo,v46term,subject.name);
  const draft={values:Object.fromEntries(schema.filter(x=>!x.readonly).map(x=>[x.key,x.key==='count'?'10':x.key==='obtained'?'35':String(x.max)])),isAbsent:false,incompatible:false};
  draftsBySubject[subject.id]={s1:draft,s2:draft};
 }
 const args={classNo,term,students,subjects,draftsBySubject};
 const result=previewIemisGradeLedger(args);
 assert.equal(result.complete,true);assert.equal(result.rows.length,2);
 for(const row of result.rows){
  assert.equal(row.subjects.length,2);
  assert.equal(row.gpa,iemisGpa(row.subjects,{annual:term==='final',primary:Number(classNo)<=5}));
 }
 const missing=previewIemisGradeLedger({...args,draftsBySubject:{...draftsBySubject,math:{s1:draftsBySubject.math.s1}}});
 assert.equal(missing.complete,false);assert.deepEqual(missing.missing,['s2']);assert.deepEqual(missing.rows,[]);
 assert.throws(()=>previewIemisGradeLedger({...args,subjects:[subjects[0],subjects[0]]}),/duplicate/);
 assert.throws(()=>previewIemisGradeLedger({...args,subjects:[{...subjects[0],creditHour:0}]}),/Positive/);
 assert.throws(()=>previewIemisGradeLedger({...args,subjects:[{...subjects[0],creditHour:'4'}]}),/Positive/);
 assert.throws(()=>previewIemisGradeLedger({...args,subjects:[{...subjects[0],creditHour:21}]}),/Positive/);
 assert.throws(()=>previewIemisGradeLedger({...args,draftsBySubject:{...draftsBySubject,foreign:{}}}),/Unexpected/);
}
console.log('V47 multi-subject grade ledger GPA source parity and incomplete-class checks passed');
