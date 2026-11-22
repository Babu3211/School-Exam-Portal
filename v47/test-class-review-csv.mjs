import assert from 'node:assert/strict';
import {buildClassReviewCsv} from './class-review-csv.mjs';
const data={format:'smss-v47-class-mark-review-v1',schoolId:'12345',classId:'9',subjectId:'computer',examId:'final',rosterCount:2,
 componentLimits:[{key:'theory',name:'Theory',fullMarks:36},{key:'practical',name:'Practical',fullMarks:10}],
 entries:[{studentId:'s1',isAbsent:false,values:{theory:35,practical:9},totalObtained:44},{studentId:'s2',isAbsent:true,values:null,totalObtained:0}],
 writeAuthorized:false,publicationAllowed:false};
const csv=buildClassReviewCsv({json:JSON.stringify(data),studentNames:{s1:'=HYPERLINK("evil")',s2:'Normal Student'}});
assert.match(csv,/^\uFEFF/);assert.match(csv,/""evil""/);assert.match(csv,/"'=/);assert.match(csv,/"s2","Normal Student","Yes","","","0"/);
assert.throws(()=>buildClassReviewCsv({json:JSON.stringify({...data,publicationAllowed:true})}),/read-only review/);
assert.throws(()=>buildClassReviewCsv({json:JSON.stringify({...data,entries:[data.entries[0],data.entries[0]]})}),/Invalid review student/);
assert.throws(()=>buildClassReviewCsv({json:JSON.stringify({...data,entries:[{...data.entries[0],values:{theory:37,practical:9},totalObtained:46},data.entries[1]]})}),/exceed configured limits/);
console.log('V47 class review CSV: absence, dynamic components, formula injection, duplicates and invalid limits checked');
