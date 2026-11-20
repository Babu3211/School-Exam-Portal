import assert from 'node:assert/strict';
import {previewIemisClassLedger} from './iemis-class-ledger-preview.mjs';
import {iemisEntrySchema,iemisEntryValues} from '../iemis-entry.js';
import {iemisSummary} from '../iemis-ledger.js';
const students=[{id:'s1',nameEnglish:'Alpha'},{id:'s2',nameEnglish:'Beta'}];
for(const klass of ['1','2','3','4','5','6','7','8','9','10'])for(const [term,v46term] of [['1st','first'],['2nd','second'],['3rd','third'],['final','annual']])for(const subject of ['English','Computer Science']){
 const schema=iemisEntrySchema(klass,v46term,subject);
 const draft={values:Object.fromEntries(schema.filter(x=>!x.readonly).map(x=>[x.key,x.key==='count'?'10':x.key==='obtained'?'30':String(x.max)])),isAbsent:false,incompatible:false};
 const result=previewIemisClassLedger({classNo:klass,term,subject,students,drafts:{s1:draft,s2:draft}});
 assert.equal(result.complete,true);assert.equal(result.rows.length,2);
 const record=iemisEntryValues(schema,draft),summary=iemisSummary(record,{annual:term==='final',primary:Number(klass)<=5});
 assert.deepEqual(result.rows[0].record,record);assert.deepEqual(result.rows[1].summary,summary);
 const partial=previewIemisClassLedger({classNo:klass,term,subject,students,drafts:{s1:draft}});
 assert.equal(partial.complete,false);assert.equal(partial.rows.length,0);assert.deepEqual(partial.missing,['s2']);
}
console.log('V47 IEMIS class ledger parity and fail-closed incomplete roster checks passed');
