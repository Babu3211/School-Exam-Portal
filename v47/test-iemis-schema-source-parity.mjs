import assert from 'node:assert/strict';
import {iemisComponentPreview,V46_TERM_MAP} from './iemis-component-preview.mjs';
import {iemisEntrySchema} from '../iemis-entry.js';
let cases=0;
for(let klass=1;klass<=10;klass++)for(const [v47term,v46term] of Object.entries(V46_TERM_MAP))for(const subject of ['English','Computer Science']){
 const expected=iemisEntrySchema(String(klass),v46term,subject);
 const actual=iemisComponentPreview(String(klass),v47term,subject);
 assert.deepEqual(actual,expected,'Class '+klass+', '+v47term+', '+subject);
 cases++;
}
console.log('V47 IEMIS field schema matches V46 source for '+cases+' class/term/subject cases');
