import assert from 'node:assert/strict';
import {iemisEntrySchema,iemisEntryValues} from '../iemis-entry.js';
import {inspectV46IemisRecord} from './iemis-record-compatibility.mjs';
const schoolId='test_school_001',examId='exam_1';
for(const classNo of [1,2,3,4,5,6,7,8,9,10])for(const term of ['1st','2nd','3rd','final']){
 const subject=classNo>=9?'Computer':'English';
 const schema=iemisEntrySchema(classNo,term==='final'?'annual':term==='1st'?'first':term==='2nd'?'second':'third',subject);
 const values=Object.fromEntries(schema.filter(c=>!c.readonly).map(c=>[c.key,c.key==='count'?'10':c.key==='obtained'?'36':String(c.max)]));
 const generated=iemisEntryValues(schema,{values,isAbsent:false,incompatible:false});
 const record={...generated,schoolId,examId,studentId:'s1',subject};
 const options={schoolId,examId,classNo,term,subject};
 assert.equal(inspectV46IemisRecord(record,options).compatible,true);
 assert.equal(inspectV46IemisRecord({...record,scores:undefined},options).compatible,false);
 assert.equal(inspectV46IemisRecord({...record,scores:record.scores.map((score,i)=>i===0?{...score,obtained:999999}:score)},options).compatible,false);
 assert.equal(inspectV46IemisRecord({...record,scores:record.scores.map((score,i)=>i===0?{...score,fullMarks:-1}:score)},options).compatible,false);
 if(classNo<=5)assert.equal(inspectV46IemisRecord({...record,scores:record.scores.map(score=>score.name==='Full Marks'?{...score,fullMarks:999}:score)},options).compatible,false);
 assert.equal(inspectV46IemisRecord({...record,schoolId:'other_school'},options).compatible,false);
 assert.equal(inspectV46IemisRecord({...record,examId:'other_exam'},options).compatible,false);
 assert.equal(inspectV46IemisRecord({...record,scores:[...record.scores,record.scores[0]]},options).compatible,false);
}
assert.equal(inspectV46IemisRecord({schoolId,examId,studentId:'s1',subject:'English',theory:30,practical:10},{schoolId,examId,classNo:6,term:'final',subject:'English'}).compatible,false);
console.log('V47 component inspector passed 40 class/term cases, tenant checks and raw-marks rejection');
