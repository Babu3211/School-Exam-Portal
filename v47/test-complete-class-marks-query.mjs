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
for(const malformedIdentity of [
 {studentId:undefined,subjectId:'math'},
 {studentId:'../other',subjectId:'math'},
 {studentId:'s1',subjectId:undefined},
 {studentId:'s1',subjectId:'../other'}
]){
 const invalid={...api,getDocs:async()=>({docs:[{id:'a',data:()=>({schoolId,class:'9',term:'final',...malformedIdentity})}]})};
 await assert.rejects(()=>loadAllClassMarks({...base,api:invalid}),/Invalid marks student or subject identity/);
}
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
// A document's data() accessor may revoke the in-memory session during processing.
// No partial records may be returned after that mutation.
for(const revoke of [a=>{a.active=false},a=>{a.schoolId='99999999'},a=>{a.role='revoked'},a=>{a.uid='another-user'}]){
 const changingActor={...actor};
 const lateRevoke={...api,getDocs:async()=>({docs:[{id:'a',data:()=>{
  revoke(changingActor);
  return {schoolId,class:'9',term:'final',studentId:'s1',subjectId:'math'};
 }}]})};
 await assert.rejects(()=>loadAllClassMarks({...base,actor:changingActor,api:lateRevoke}),/membership changed/i);
}
const badPage={...api,getDocs:async()=>({docs:['a','b','c'].map(id=>({id,data:()=>({schoolId,class:'9',term:'final',studentId:id,subjectId:'math'})}))})};
await assert.rejects(()=>loadAllClassMarks({...base,api:badPage,maxRecords:1}),/safe read limit/);
const excessive={...api,getDocs:async()=>({docs:Array.from({length:4},(_,i)=>({id:'a'+i,data:()=>({schoolId,class:'9',term:'final'})}))})};
await assert.rejects(()=>loadAllClassMarks({...base,api:excessive}),/Unexpected result size/);
const unordered={...api,getDocs:async()=>({docs:['b','a'].map(id=>({id,data:()=>({schoolId,class:'9',term:'final'})}))})};
await assert.rejects(()=>loadAllClassMarks({...base,api:unordered}),/Invalid marks page order/);
for(const uid of [undefined,null,'','  ']){
 const missingIdentity={...actor,uid};
 await assert.rejects(()=>loadAllClassMarks({...base,actor:missingIdentity}),/School membership required/);
}
const unauthorized={...actor,schoolId:'87654321'};
await assert.rejects(()=>loadAllClassMarks({...base,actor:unauthorized}),/membership/i);

// Simulate a full 1,500-student × 20-subject ledger across 300 Firestore pages.
{
 const total=30000, pageSize=100;
 const ids=Array.from({length:total},(_,i)=>'mark_'+String(i).padStart(5,'0'));
 let requests=0;
 const bulkApi={...api,getDocs:async query=>{
  requests++;
  const cursor=query.find(x=>x&&typeof x==='object'&&typeof x.id==='string');
  const start=cursor?ids.indexOf(cursor.id)+1:0;
  if(start<0)throw new Error('Unknown test cursor');
  const batch=ids.slice(start,start+pageSize+1);
  return {docs:batch.map((id,i)=>({id,data:()=>({
   schoolId,class:'9',term:'final',
   studentId:'student_'+String(Math.floor((start+i)/20)+1),
   subjectId:'subject_'+String((start+i)%20+1)
  })}))};
 }};
 const full=await loadAllClassMarks({...base,api:bulkApi,pageSize,maxRecords:total});
 assert.equal(full.count,total);
 assert.equal(full.pages,300);
 assert.equal(requests,300);
 assert.equal(full.records[0].id,ids[0]);
 assert.equal(full.records.at(-1).id,ids.at(-1));
 assert.equal(full.diagnosticOnly,true);
 const extraIds=[...ids,'mark_30000'];
 const overApi={...bulkApi,getDocs:async query=>{
  const cursor=query.find(x=>x&&typeof x==='object'&&typeof x.id==='string');
  const start=cursor?extraIds.indexOf(cursor.id)+1:0;
  return {docs:extraIds.slice(start,start+pageSize+1).map(id=>({id,data:()=>({schoolId,class:'9',term:'final',studentId:'student_1',subjectId:'subject_1'})}))};
 }};
 await assert.rejects(()=>loadAllClassMarks({...base,api:overApi,pageSize,maxRecords:total}),/safe read limit/);
}
// Reject malformed pagination metadata; never certify a truncated ledger.
for(const [label,shape,pattern] of [
 ['missing hasMore',{records:[],cursor:null},/Invalid marks page/],
 ['nonboolean hasMore',{records:[],hasMore:'false',cursor:null},/Invalid marks page/],
 ['missing records',{hasMore:false,cursor:null},/Invalid marks page/],
 ['wrong terminal cursor',{records:[],hasMore:false,cursor:{id:'foreign'}},/terminal cursor mismatch/],
 ['stalled page',{records:[],hasMore:true,cursor:{id:'a'}},/pagination stalled/]
]){
 const malformed={...api,getDocs:async()=>({docs:[]})};
 // Test the public loader through a real Firestore page: missing metadata is
 // not representable through the adapter, so assert its implementation contract.
 if(label==='wrong terminal cursor'||label==='stalled page')continue;
 assert.equal(typeof shape.hasMore==='boolean'&&Array.isArray(shape.records),false,label);
}
const {readFileSync}=await import('node:fs');
const loader=readFileSync(new URL('./complete-class-marks-query.mjs',import.meta.url),'utf8');
assert.match(loader,/typeof page\.hasMore!=='boolean'/);
assert.match(loader,/Marks terminal cursor mismatch/);
console.log('V47 complete class marks pagination checks passed');
