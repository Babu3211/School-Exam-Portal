import assert from 'node:assert/strict';
import {previewV46SubjectResult,previewV46Gpa} from './v46-result-adapter.mjs';
import {iemisSummary,iemisGpa} from './v46-iemis-ledger.js';
for(const factor of [1,2,5,10]){
 const components=[{key:'in',name:'Internal',fullMarks:40*factor},{key:'th',name:'TH (Theory)',fullMarks:60*factor}];
 const obtained={in:32*factor,th:48*factor};
 const result=previewV46SubjectResult({components,obtained,annual:true});
 const expected=iemisSummary({scores:[{name:'Internal',fullMarks:40*factor,obtained:32*factor},{name:'TH (Theory)',fullMarks:60*factor,obtained:48*factor}]},{annual:true});
 assert.deepEqual(result,expected);
 assert.equal(previewV46Gpa({subjects:[{summary:result,creditHour:4}],annual:true}),iemisGpa([{summary:expected,creditHour:4}],{annual:true}));
}
const valid=[{key:'in',name:'Internal',fullMarks:40},{key:'th',name:'TH (Theory)',fullMarks:60}];
for(const components of [[valid[0],valid[0]],[{key:'in',name:'Internal',fullMarks:-1}],[]])assert.throws(()=>previewV46SubjectResult({components,obtained:{in:10,th:20},annual:true}));
assert.throws(()=>previewV46SubjectResult({components:valid,obtained:{in:41,th:20},annual:true}));
assert.throws(()=>previewV46SubjectResult({components:valid,obtained:{in:30},annual:true}));
assert.throws(()=>previewV46SubjectResult({components:valid,obtained:{in:30,th:Infinity},annual:true}));
console.log('V47 V46-result adapter preserves V46 grade and GPA');
