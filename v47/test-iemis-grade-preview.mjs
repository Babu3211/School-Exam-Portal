import assert from 'node:assert/strict';
import {previewGrade,previewFinalGrade} from './iemis-grade-preview.mjs';
import {iemisGrade,iemisFinalGrade} from '../iemis-ledger.js';
for(let n=0;n<=10000;n++){const pct=n/100;assert.deepEqual(previewGrade(pct),iemisGrade(pct),'V46 percent parity '+pct)}
for(let n=0;n<=4000;n++){const point=n/1000;assert.deepEqual(previewFinalGrade(point),iemisFinalGrade(point),'V46 final point parity '+point)}
for(const invalid of [-1,101,NaN,Infinity,-Infinity,null,'90',undefined])assert.deepEqual(previewGrade(invalid),typeof invalid==='number'?iemisGrade(invalid):null);
for(const invalid of [-1,4.1,NaN,Infinity,-Infinity,null,undefined])assert.deepEqual(previewFinalGrade(invalid),iemisFinalGrade(invalid));
console.log('V47 read-only grade bands match V46 source across 14,002 cases');
