import assert from 'node:assert/strict';
import {loadAllClassMarks} from './complete-class-marks-query.mjs';
const schoolId='12345678',actor={uid:'admin',schoolId,role:'school_admin',active:true};
const calls=[];
const api={collection:(_db,...path)=>path.join('/'),where:(...x)=>x,orderBy:(...x)=>x,limit:n=>n,startAfter:x=>x,query:(...x)=>x,getDocs:async query=>{calls.push(query[0]);const after=query.find(x=>x&&typeof x==='object'&&x.id)?.id;const ids=after==='b'?['c']:['a','b','c'];return {docs:ids.map(id=>({id,data:()=>({schoolId,studentId:id,subjectId:'math',class:'9',term:'final'})}))}}};
const base={db:{},api,actor,schoolId,schoolClass:'9',term:'final',pageSize:2};
const result=await loadAllClassMarks(base);
assert.deepEqual(result.records.map(r=>r.id),['a','b','c']);
assert.equal(result.count,3);
assert.equal(result.pages,2);
assert.equal(result.hasMore,false);
assert.equal(result.diagnosticOnly,true);
assert.deepEqual(calls,['schools/12345678/marks','schools/12345678/marks']);
await assert.rejects(()=>loadAllClassMarks({...base,maxRecords:2}),/safe read limit/);
await assert.rejects(()=>loadAllClassMarks({...base,pageSize:101}),/page size/);
await assert.rejects(()=>loadAllClassMarks({...base,maxRecords:30001}),/record limit/);
const bounded=await loadAllClassMarks({...base,maxRecords:30000});
assert.equal(bounded.count,3);
const bad={...api,getDocs:async()=>({docs:[{id:'a',data:()=>({schoolId,class:'10',term:'final'})}]})};
await assert.rejects(()=>loadAllClassMarks({...base,api:bad}),/Foreign or mismatched marks record/);
for(const missingSnapshot of [null,undefined,{}]){
 const missingApi={...api,getDocs:async()=>missingSnapshot};
 await assert.rejects(()=>loadAllClassMarks({...base,api:missingApi}),/Unexpected result size/);
}
for(const malformed of [null,undefined,[]]){
 const broken={...api,getDocs:async()=>({docs:[{id:'a',data:()=>malformed}]})};
 await assert.rejects(()=>loadAllClassMarks({...base,api:broken}),/Foreign or mismatched marks record/);
}
const colonIds=['final:s1:math','final:s2:math','final:s3:math'];
const colonApi={...api,getDocs:async query=>{
 const after=query.find(x=>x&&typeof x==='object'&&x.id)?.id;
 const ids=after===colonIds[1]?[colonIds[2]]:colonIds;
 return {docs:ids.map(id=>({id,data:()=>({schoolId,studentId:id.split(':')[1],subjectId:'math',class:'9',term:'final'})}))};
}};
const colonResult=await loadAllClassMarks({...base,api:colonApi});
assert.deepEqual(colonResult.records.map(r=>r.id),colonIds);
assert.equal(colonResult.pages,2);
let reads=0;
const changing={...api,getDocs:async()=>({docs:[{id:'a',data:()=>{reads++;return reads===1?{schoolId,class:'9',term:'final',studentId:'s1',subjectId:'math'}:{schoolId:'99999999',class:'9',term:'final'};}}]})};
const once=await loadAllClassMarks({...base,api:changing});
assert.equal(reads,1,'Firestore document must be materialized only once');
assert.equal(once.records[0].schoolId,schoolId);
for(const revoke of [a=>{a.active=false},a=>{a.schoolId='99999999'},a=>{a.role='revoked'}]){
 const changingActor={...actor};
 const revoked={...api,getDocs:async query=>{revoke(changingActor);return api.getDocs(query)}};
 await assert.rejects(()=>loadAllClassMarks({...base,actor:changingActor,api:revoked}),/membership changed/i);
}
const badPage={...api,getDocs:async()=>({docs:['a','b','c'].map(id=>({id,data:()=>({schoolId,class:'9',term:'final'})}))})};
await assert.rejects(()=>loadAllClassMarks({...base,api:badPage,maxRecords:1}),/safe read limit/);
const excessive={...api,getDocs:async()=>({docs:Array.from({length:4},(_,i)=>({id:'a'+i,data:()=>({schoolId,class:'9',term:'final'})}))})};
await assert.rejects(()=>loadAllClassMarks({...base,api:excessive}),/Unexpected result size/);
const unordered={...api,getDocs:async()=>({docs:['b','a'].map(id=>({id,data:()=>({schoolId,class:'9',term:'final'})}))})};
await assert.rejects(()=>loadAllClassMarks({...base,api:unordered}),/Invalid marks page order/);
const unauthorized={...actor,schoolId:'87654321'};
await assert.rejects(()=>loadAllClassMarks({...base,actor:unauthorized}),/membership/i);
console.log('V47 complete class marks pagination checks passed');
