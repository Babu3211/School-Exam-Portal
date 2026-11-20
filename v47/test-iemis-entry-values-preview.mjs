import assert from 'node:assert/strict';
import {previewIemisEntryValues} from './iemis-entry-values-preview.mjs';
import {iemisEntrySchema,iemisEntryValues} from '../iemis-entry.js';
let cases=0;
const check=(schema,draft)=>{
 let expected,actual,expectedError,actualError;
 try{expected=iemisEntryValues(schema,draft)}catch(e){expectedError=e.message}
 try{actual=previewIemisEntryValues(schema,draft)}catch(e){actualError=e.message}
 assert.equal(actualError,expectedError,'Validation error parity');
 if(!expectedError)assert.deepEqual(actual,expected,'Entry record parity');
 cases++;
};
for(const klass of [1,3,5,6,8,9,10])for(const term of ['first','second','third','annual'])for(const subject of ['English','Computer Science']){
 const schema=iemisEntrySchema(klass,term,subject);
 const blank=Object.fromEntries(schema.filter(x=>!x.readonly).map(x=>[x.key,'']));
 for(const absent of [false,true]){
  check(schema,{values:blank,isAbsent:absent,incompatible:false});
  check(schema,{values:blank,isAbsent:absent,incompatible:true});
  const full=Object.fromEntries(schema.filter(x=>!x.readonly).map(x=>[x.key,x.key==='count'?'10':x.key==='obtained'?'30':String(x.max)]));
  check(schema,{values:full,isAbsent:absent,incompatible:false});
 }
 for(const component of schema.filter(x=>!x.readonly))for(const bad of ['-1','abc','100000','0.5','']){
  const values=Object.fromEntries(schema.filter(x=>!x.readonly).map(x=>[x.key,x.key==='count'?'10':x.key==='obtained'?'30':String(x.max)]));
  values[component.key]=bad;
  check(schema,{values,isAbsent:false,incompatible:false});
 }
}
console.log('V47 read-only IEMIS entry values parity passed: '+cases+' cases');
