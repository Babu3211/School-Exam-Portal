import assert from 'node:assert/strict';
import {reviewOrSaveAtomicClassAttendance} from './server-atomic-class-attendance.mjs';
import {createV47NodeAtomicAttendanceHandler} from '../src/v47/node-atomic-attendance-handler.mjs';
import {createServer} from 'node:http';
import {once} from 'node:events';
const schoolId='12345',classId='9',date='2026-11-24',actorUid='admin1';
const root='schools/'+schoolId,scope={schoolId,classId,date,actorUid};
function fixture(n){
 const docs=new Map([[root,{id:schoolId,active:true}],[root+'/members/'+actorUid,{schoolId,uid:actorUid,role:'school_admin',active:true}]]);
 const entries=Array.from({length:n},(_,i)=>({studentId:'s'+String(i).padStart(4,'0'),class:classId,date,present:true}));
 for(const e of entries)docs.set(root+'/students/'+e.studentId,{schoolId,class:classId,active:true});
 let commits=0,writes=0,fail=false;
 const firestore={doc:path=>({path}),collection:path=>({where:(field,op,v)=>({orderBy:order=>({limit:limit=>({query:path,field,op,v,order,limit})})})}),
 runTransaction:async callback=>{
  const pending=[];
  const read=async r=>{
   assert.equal(pending.length,0,'All reads before writes');
   if(r.query){assert.equal(r.query,root+'/students');assert.equal(r.limit,1501);return {docs:[...docs].filter(([p,d])=>p.startsWith(r.query+'/')&&d.class===r.v).map(([p,d])=>({id:p.split('/').at(-1),ref:{path:p},data:()=>structuredClone(d)}))}}
   return {ref:r,exists:docs.has(r.path),data:()=>structuredClone(docs.get(r.path))};
  };
  const result=await callback({get:read,getAll:(...refs)=>Promise.all(refs.map(read)),set:(ref,data)=>pending.push([ref.path,data])});
  if(fail&&pending.length)throw Error('Simulated transaction failure');
  if(pending.length){commits++;writes+=pending.length;for(const [p,d] of pending)docs.set(p,structuredClone(d))}
  return result;
 }};
 return {docs,entries,firestore,get commits(){return commits},get writes(){return writes},fail:()=>{fail=true}};
}
const run=(f,extra={})=>reviewOrSaveAtomicClassAttendance({firestore:f.firestore,...scope,entries:f.entries,...extra});
for(const n of [1,11,101,500]){
 const f=fixture(n);
 const review=await run(f);assert.equal(review.committed,false);assert.equal(f.writes,0);
 const result=await run(f,{reviewDigest:review.reviewDigest});
 assert.equal(result.committed,true);assert.equal(result.atomic,true);assert.equal(result.count,n);
 assert.equal(f.commits,1);assert.equal(f.writes,n);
 assert.equal((await run(f)).changed,0);
 await assert.rejects(run(f,{reviewDigest:review.reviewDigest}),/changed after review/);
}
{
 const f=fixture(101),review=await run(f);f.fail();
 await assert.rejects(run(f,{reviewDigest:review.reviewDigest}),/transaction failure/);
 assert.equal(f.writes,0,'No partial attendance');
}
for(const mutate of [
 f=>f.docs.get(root+'/members/'+actorUid).active=false,
 f=>f.docs.get(root+'/members/'+actorUid).role='viewer',
 f=>f.docs.get(root+'/students/s0000').active=false,
 f=>f.docs.set(root+'/students/new',{schoolId,class:classId,active:true}),
 f=>f.docs.set(root+'/attendance/'+date+'_s0000',{schoolId,class:classId,date,studentId:'s0000',present:false})
]){
 const f=fixture(11),review=await run(f);mutate(f);
 await assert.rejects(run(f,{reviewDigest:review.reviewDigest}));assert.equal(f.writes,0);
}
{
 const f=fixture(501);await assert.rejects(run(f),/500/);assert.equal(f.writes,0);
 await assert.rejects(run(f,{entries:f.entries.slice(0,500)}),/500/);assert.equal(f.writes,0);
}
{
 const f=fixture(11);
 f.docs.get(root+'/members/'+actorUid).role='teacher';
 await assert.rejects(run(f),/assignment/);
 const assignment=root+'/teacher_assignments/'+schoolId+':'+actorUid+':'+classId+':attendance';
 f.docs.set(assignment,{schoolId,uid:actorUid,classId,subjectId:'attendance',active:true});
 const review=await run(f);f.docs.get(assignment).active=false;
 await assert.rejects(run(f,{reviewDigest:review.reviewDigest}),/assignment/);
 assert.equal(f.writes,0);
 f.docs.get(assignment).active=true;
 const valid=await run(f);assert.equal((await run(f,{reviewDigest:valid.reviewDigest})).committed,true);
}
{
 const f=fixture(11);
 const auth={verifyIdToken:async(token,revoked)=>{assert.equal(revoked,true);return {uid:token}}};
 const handler=createV47NodeAtomicAttendanceHandler({auth,firestore:f.firestore,atomicAttendanceEnabled:true});
 const server=createServer(handler);
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const url='http://127.0.0.1:'+server.address().port+'/api/v47/attendance/atomic';
  const req={schoolId,classId,date,entries:f.entries,reviewDigest:null};
  const post=(body=req,token=actorUid)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
  assert.equal((await post(req,null)).status,401);
  assert.equal((await post({...req,actorUid})).status,400);
  assert.equal((await post(req,'other')).status,403);
  const r=await post();assert.equal(r.status,200);
  const {result}=await r.json();assert.equal(result.committed,false);
  const save=await post({...req,reviewDigest:result.reviewDigest});assert.equal(save.status,200);
  assert.equal((await save.json()).result.committed,true);assert.equal(f.commits,1);
 }finally{await new Promise(resolve=>server.close(resolve))}
}
console.log('PASS V47 atomic attendance: 1/11/101/500, zero partial writes, concurrent changes and role/tenant boundaries');
