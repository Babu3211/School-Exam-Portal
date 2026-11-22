import assert from 'node:assert/strict';
import {validateMarkEntry} from './marks-service.mjs';
const base={studentId:'s1',subjectId:'subject1',class:'9',term:'monthly',theory:0,practical:0};
for(const [theory,practical] of [[0,0],[4,36],[100,100],[120,280],[2500,500],['300','120'],[0.5,0.25]]){
 const actual=validateMarkEntry({...base,theory,practical});
 assert.equal(actual.theory,Number(theory));
 assert.equal(actual.practical,Number(practical));
}
for(const bad of [null,undefined,NaN,Infinity,-1,'-2','1e3','',{},[],true,false]){
 assert.throws(()=>validateMarkEntry({...base,theory:bad}));
 assert.throws(()=>validateMarkEntry({...base,practical:bad}));
}
for(const invalidPayload of [null,undefined,[],[base],{},'invalid',123]){
 assert.throws(()=>validateMarkEntry(invalidPayload));
}
for(const id of [null,undefined,'','../foreign','student/2','a'.repeat(129),42]){
 assert.throws(()=>validateMarkEntry({...base,studentId:id}),/Invalid student ID/);
 assert.throws(()=>validateMarkEntry({...base,subjectId:id}),/Invalid subject ID/);
}
console.log('V47 raw mark parsing supports configurable full marks without hardcoded maximum');
