import assert from 'node:assert/strict';
import {validateLedgerReviewPage} from '../v47/ledger-review-page-guard.mjs';
const schoolId='12345678',schoolClass='9',term='final',collection='marks';
const record=(id,overrides={},path='schools/'+schoolId+'/marks/'+id)=>({
 id,ref:{path},data:()=>({schoolId,class:schoolClass,term,studentId:'s1',subjectId:'math',...overrides})
});
const base={schoolId,schoolClass,term,collection,docs:[record('final:s1:math')]};
assert.deepEqual(validateLedgerReviewPage(base)[0],{schoolId,class:'9',term:'final',studentId:'s1',subjectId:'math',id:'final:s1:math'});
for(const docs of [
 [record('final:s1:math',{schoolId:'87654321'})],
 [record('final:s1:math',{class:'10'})],
 [record('final:s1:math',{term:'1st'})],
 [record('final:s1:math',{},'schools/87654321/marks/final:s1:math')],
 [record('final:s1:math'),record('final:s1:math')],
 [record('final:s2:math'),record('final:s1:math')],
 [record('bad/id')],
 [{id:'final:s1:math',data:()=>null}],
 [record('final:s1:math',{id:'forged'})]
])assert.throws(()=>validateLedgerReviewPage({...base,docs}),/Foreign|Invalid|Malformed/);
assert.throws(()=>validateLedgerReviewPage({...base,previousId:'final:s1:math'}),/out-of-order/);
assert.throws(()=>validateLedgerReviewPage({...base,docs:Array.from({length:101},(_,i)=>record('m'+String(i).padStart(3,'0')))}),/page size/);
assert.throws(()=>validateLedgerReviewPage({...base,collection:'admins'}),/Unsupported/);
assert.throws(()=>validateLedgerReviewPage({...base,schoolId:'87654321'}),/Foreign/);
assert.deepEqual(validateLedgerReviewPage({...base,collection:'students',docs:[{id:'s1',data:()=>({schoolId,class:'9',name:'One'})}]}).map(v=>v.id),['s1']);
console.log('V47 missing-marks Excel review rejects foreign, stale, duplicate and malformed pages');
