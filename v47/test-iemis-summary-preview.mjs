import assert from 'node:assert/strict';
import {previewIemisSummary} from './iemis-summary-preview.mjs';
import {iemisSummary} from '../iemis-ledger.js';
const cases=[null,{isAbsent:true,scores:[]},{scores:[]},{scores:[{name:'No. of Learning Achievement',fullMarks:5,obtained:5},{name:'Full Marks',fullMarks:20,obtained:null},{name:'Obtained Learning Achievement',fullMarks:20,obtained:18}]},{scores:[{name:'Participation',fullMarks:4,obtained:3},{name:'Practical/Project',fullMarks:36,obtained:31},{name:'First Term Examination',fullMarks:10,obtained:8}]},{scores:[{name:'Participation',fullMarks:4,obtained:3},{name:'Practical/Project',fullMarks:36,obtained:31},{name:'Total of Term',fullMarks:10,obtained:8},{name:'TH (Theory)',fullMarks:50,obtained:42}]}];
for(const record of cases)for(const annual of [false,true])for(const primary of [false,true])assert.deepEqual(previewIemisSummary(record,{annual,primary}),iemisSummary(record,{annual,primary}));
for(let n=0;n<=100;n++){const record={scores:[{name:'Participation',fullMarks:4,obtained:n/25},{name:'Practical/Project',fullMarks:36,obtained:n*0.36},{name:'Total of Term',fullMarks:10,obtained:n/10},{name:'TH (Theory)',fullMarks:50,obtained:n/2}]};for(const annual of [false,true])assert.deepEqual(previewIemisSummary(record,{annual}),iemisSummary(record,{annual}),'Score '+n)}
for(const obtained of [null,'',-1,0,35,40,50,60,70,80,90,100,101,NaN]){
 const record={scores:[{name:'Participation',fullMarks:4,obtained:obtained===null?null:4},{name:'Practical/Project',fullMarks:36,obtained:obtained===null?null:36},{name:'Total of Term',fullMarks:10,obtained:obtained===null?null:10},{name:'TH (Theory)',fullMarks:100,obtained}]};
 for(const annual of [true,false])assert.deepEqual(previewIemisSummary(record,{annual}),iemisSummary(record,{annual}));
}
console.log('V47 read-only IEMIS subject summary parity checks passed');
