import assert from 'node:assert/strict';import {rawMarksCsv} from '../v47/marks-preview-export.mjs';
const csv=rawMarksCsv([{studentId:'s1',subjectId:'math',class:'6',term:'1st',theory:35,practical:8},{studentId:'=1+1',subjectId:'bad,"field',class:'6',term:'final',theory:0,practical:0}]);
assert.match(csv,/studentId,subjectId,class,term,theory,practical/);assert.match(csv,/"'=1\+1"/);assert.match(csv,/"bad,""field"/);assert.match(csv,/"35","8"/);assert.throws(()=>rawMarksCsv(Array(1501).fill({})),/1500/);assert.throws(()=>rawMarksCsv({}),/Array/);assert.equal(rawMarksCsv([]),'studentId,subjectId,class,term,theory,practical\r\n');
console.log('V47 raw marks CSV export tests passed');
