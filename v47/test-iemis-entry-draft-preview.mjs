import assert from 'node:assert/strict';
import {iemisEntrySchema,iemisEntryDraft} from '../iemis-entry.js';
import {iemisComponentKey} from '../iemis-ledger.js';
import {previewIemisEntryDraft} from './iemis-entry-draft-preview.mjs';
import {previewIemisComponentKey} from './iemis-component-key-preview.mjs';
let cases=0;
for(const name of [null,'','No. of Learning Achievement','Full Marks','Obtained Learning Achievement','Participation','Practical/Project','First Term Examination','TH (Theory)','Total of final marks','unexpected']){
 assert.equal(previewIemisComponentKey(name),iemisComponentKey(name));cases++;
}
for(const klass of [1,3,5,6,8,9,10])for(const term of ['first','second','third','annual'])for(const subject of ['English','Computer Science']){
 const schema=iemisEntrySchema(klass,term,subject);
 const records=[null,{isAbsent:true,scores:[]},{scores:[]},{scores:schema.map(x=>({name:x.name,fullMarks:x.max??10,obtained:1}))},{scores:schema.map(x=>({name:x.name,fullMarks:x.max??10,obtained:null}))},{scores:[{name:'Unknown Component',fullMarks:20,obtained:5}]},{scores:schema.map(x=>({name:x.name,fullMarks:999,obtained:5}))}];
 for(const record of records){assert.deepEqual(previewIemisEntryDraft(record,schema),iemisEntryDraft(record,schema));cases++}
}
console.log('V47 read-only IEMIS draft and component key parity passed: '+cases+' cases');
