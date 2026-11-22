import assert from 'node:assert/strict';
import {calculateConfiguredPercentage} from './configured-percentage.mjs';
for(const [full,obtained] of [[40,32],[75,60],[100,80],[250,200],[500,400]]){
 const result=calculateConfiguredPercentage({theoryFullMarks:full,practicalFullMarks:0},{theory:obtained,practical:0});
 assert.equal(result.percentage,80);
}
assert.equal(calculateConfiguredPercentage({theoryFullMarks:4,practicalFullMarks:36},{theory:4,practical:36}).percentage,100);
assert.equal(calculateConfiguredPercentage({theoryFullMarks:25,practicalFullMarks:75},{theory:20,practical:60}).percentage,80);
for(const full of [0,-1,undefined,null,'bad'])assert.throws(()=>calculateConfiguredPercentage({theoryFullMarks:full,practicalFullMarks:0},{theory:0,practical:0}));
assert.throws(()=>calculateConfiguredPercentage({theoryFullMarks:40,practicalFullMarks:0},{theory:41,practical:0}));
console.log('V47 configurable full marks normalize to 100 percent');
