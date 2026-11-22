import assert from 'node:assert/strict';
import {iemisGrade,iemisSummary,iemisGpa} from './v46-iemis-ledger.js';
// This module is copied verbatim from V46 main iemis-ledger.js, Git blob 319775e473f716ed16134e39a88114139a42fddd.
for(const [percent,grade,point] of [[100,'A+',4],[90,'A+',4],[80,'A',3.6],[70,'B+',3.2],[60,'B',2.8],[50,'C+',2.4],[40,'C',2],[35,'D',1.6],[34.99,'NG',null]]){
 const result=iemisGrade(percent);
 assert.equal(result.grade,grade);
 assert.equal(result.point,point);
}
const record={scores:[{name:'Participation',fullMarks:4,obtained:4},{name:'Practical/Project',fullMarks:36,obtained:28},{name:'TH (Theory)',fullMarks:60,obtained:48}]};
const summary=iemisSummary(record,{annual:true});
assert.equal(summary.full,100);
assert.equal(summary.obtained,80);
assert.equal(summary.complete,true);
assert.equal(iemisGpa([{summary,creditHour:4}],{annual:true}), (40*summary.inGrade.point+60*summary.theoryGrade.point)/100);
assert.equal(iemisGpa([{summary,creditHour:4}],{annual:false}),null);
assert.equal(iemisGpa([{summary:{...summary,complete:false},creditHour:4}],{annual:true}),null);
console.log('V47 reused V46 IEMIS grade and GPA regression checks passed');
