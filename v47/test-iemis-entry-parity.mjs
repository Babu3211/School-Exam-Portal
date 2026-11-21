import assert from 'node:assert/strict';
import {iemisEntrySchema,iemisEntryValues,iemisEntryDraft,normalizeIemisEntryScores} from './iemis-entry.js';
import {iemisSummary} from './iemis-ledger.js';
// V46 source parity smoke tests; these do not authorize tenant marks writes.
for(const classNo of [1,2,3,4,5]){
 const schema=iemisEntrySchema(classNo,'first','Math');
 assert.deepEqual(schema.map(x=>x.key),['count','full','obtained']);
 const result=iemisEntryValues(schema,{values:{count:'10',obtained:'32'},isAbsent:false});
 assert.equal(result.totalFullMarks,40);
 assert.equal(iemisSummary(result,{primary:true}).totalGrade.grade,'A');
 assert.throws(()=>iemisEntryValues(schema,{values:{count:'10',obtained:'41'},isAbsent:false}),/from 0 to 40/);
}
for(const classNo of [6,7,8,9,10])for(const term of ['first','second','annual']){
 const subject=classNo>=9?'Computer Science':'Mathematics';
 const schema=iemisEntrySchema(classNo,term,subject);
 assert.deepEqual(schema.slice(0,3).map(x=>x.max),[4,36,10]);
 const result=iemisEntryValues(schema,{values:Object.fromEntries(schema.map(x=>[x.key,String(x.max)])),isAbsent:false});
 assert.equal(result.totalObtained,term==='annual'?100:50);
 assert.equal(iemisEntryValues(schema,{values:Object.fromEntries(schema.map(x=>[x.key,''])),isAbsent:false}),null);
}
assert.deepEqual(iemisEntrySchema(9,'first','Mathematics').map(x=>x.max),[3,16,6]);
assert.throws(()=>iemisEntrySchema(11,'annual'),/1–10/);
const schema=iemisEntrySchema(9,'first','Computer Science');
const old={scores:[{name:'Custom component',fullMarks:50,obtained:20}]};
assert.equal(iemisEntryDraft(old,schema).incompatible,true);
assert.deepEqual(normalizeIemisEntryScores(9,'first','Computer Science',old.scores),old.scores);
console.log('V47 V46 IEMIS entry schema parity checks passed');
