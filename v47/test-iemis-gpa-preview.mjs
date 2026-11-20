import assert from 'node:assert/strict';
import {previewIemisGpa} from './iemis-gpa-preview.mjs';
import {previewIemisSummary} from './iemis-summary-preview.mjs';
import {iemisGpa,iemisSummary} from '../iemis-ledger.js';
const records=[{scores:[{name:'No. of Learning Achievement',fullMarks:10,obtained:10},{name:'Obtained Learning Achievement',fullMarks:40,obtained:35}]},{scores:[{name:'Participation',fullMarks:4,obtained:4},{name:'Practical/Project',fullMarks:36,obtained:30},{name:'Total of Term',fullMarks:10,obtained:9},{name:'TH (Theory)',fullMarks:50,obtained:43}]},{isAbsent:true,scores:[]}];
for(const primary of [true,false])for(const annual of [true,false])for(const credit of [1,2,4,0,-1,NaN])for(const record of records){const subjects=[{summary:previewIemisSummary(record,{primary,annual}),creditHour:credit}];const original=[{summary:iemisSummary(record,{primary,annual}),creditHour:credit}];assert.deepEqual(previewIemisGpa(subjects,{primary,annual}),iemisGpa(original,{primary,annual}))}
assert.equal(previewIemisGpa([]),null);
assert.equal(previewIemisGpa([{summary:{complete:false},creditHour:4}],{annual:true}),null);
console.log('V47 read-only GPA parity checks passed');
