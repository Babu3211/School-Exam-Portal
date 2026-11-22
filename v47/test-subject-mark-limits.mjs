import assert from 'node:assert/strict';
import {validateSubjectMarkLimits} from './subject-mark-limits.mjs';
for(const name of ['Computer','Nepali','Mathematics','New Optional Subject']){
 for(const [theoryFullMarks,practicalFullMarks] of [[4,36],[23,7],[70,30],[0,100]]){
  const subject={name,theoryFullMarks,practicalFullMarks};
  assert.equal(validateSubjectMarkLimits(subject,{theory:theoryFullMarks,practical:practicalFullMarks}),true);
  assert.throws(()=>validateSubjectMarkLimits(subject,{theory:theoryFullMarks+1,practical:0}),/exceed/);
  assert.throws(()=>validateSubjectMarkLimits(subject,{theory:0,practical:practicalFullMarks+1}),/exceed/);
 }
}
for(const [theoryFullMarks,practicalFullMarks] of [['4','36'],['23.5','7.25'],[' 70 ',' 30 '],['.5','0']]){
 assert.equal(validateSubjectMarkLimits({theoryFullMarks,practicalFullMarks},{theory:Number(theoryFullMarks),practical:Number(practicalFullMarks)}),true);
 assert.throws(()=>validateSubjectMarkLimits({theoryFullMarks,practicalFullMarks},{theory:Number(theoryFullMarks)+1,practical:0}),/exceed/);
}
for(const invalid of [-1,'oops',Infinity,{},'10 marks',null,'',NaN,'-2','1e3'])assert.throws(()=>validateSubjectMarkLimits({theoryFullMarks:invalid},{theory:0,practical:0}),/Invalid/);
assert.equal(validateSubjectMarkLimits({theoryFullMarks:0,practicalFullMarks:0},{theory:0,practical:0}),true);
assert.throws(()=>validateSubjectMarkLimits({theoryFullMarks:0},{theory:1,practical:0}),/exceed/);
assert.equal(validateSubjectMarkLimits({name:'Legacy'},{theory:25,practical:10}),true);
for(const score of [undefined,null,NaN,Infinity,-1,'', '2', {}, []]){
 assert.throws(()=>validateSubjectMarkLimits({theoryFullMarks:20},{theory:score,practical:0}),/Invalid entered theory/);
 assert.throws(()=>validateSubjectMarkLimits({practicalFullMarks:10},{theory:0,practical:score}),/Invalid entered practical/);
}
for(const value of [null,undefined,0,''])assert.throws(()=>validateSubjectMarkLimits(value,{theory:0,practical:0}),/required/);
assert.throws(()=>validateSubjectMarkLimits({theoryFullMarks:20},null),/required/);
console.log('V47 configured full marks validation passed');
