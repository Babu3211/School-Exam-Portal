import assert from 'node:assert/strict';
import {previewIemisEntryResult} from './iemis-entry-result-preview.mjs';
import {iemisEntrySchema,iemisEntryValues} from '../iemis-entry.js';
import {iemisSummary} from '../iemis-ledger.js';
import {V46_TERM_MAP} from './iemis-component-preview.mjs';
let cases=0;
for(const klass of [1,2,3,4,5,6,7,8,9,10])for(const [term,v46term] of Object.entries(V46_TERM_MAP))for(const subject of ['English','Computer Science']){
 const schema=iemisEntrySchema(klass,v46term,subject);
 for(const absent of [false,true])for(const blank of [false,true]){
  const values=Object.fromEntries(schema.filter(x=>!x.readonly).map(x=>[x.key,blank?'':x.key==='count'?'10':x.key==='obtained'?'30':String(x.max)]));
  const draft={values,isAbsent:absent,incompatible:false};
  const expected=iemisEntryValues(schema,draft);
  const actual=previewIemisEntryResult(klass,term,subject,draft);
  assert.deepEqual(actual.schema,schema);
  assert.deepEqual(actual.record,expected);
  assert.deepEqual(actual.summary,expected===null?null:iemisSummary(expected,{annual:term==='final',primary:klass<=5}));
  cases++;
 }
}
for(const term of ['weekly','monthly'])assert.throws(()=>previewIemisEntryResult('9',term,'English',{values:{},isAbsent:false,incompatible:false}),/not verified/);
for(const klass of ['ECD','11','12'])assert.throws(()=>previewIemisEntryResult(klass,'1st','English',{values:{},isAbsent:false,incompatible:false}),/Classes 1–10/);
console.log('V47 IEMIS read-only end-to-end entry-to-summary parity passed: '+cases+' cases');
