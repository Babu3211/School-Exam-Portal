// HTTP contract, synthetic 101-student V47 school; no writes, no real Firebase.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createV47ApiServer} from '../src/v47/node-api-server.mjs';
const scope={schoolId:'12345678',classId:'9',subjectId:'computer',examId:'final'};
const uid='admin1',base='schools/'+scope.schoolId,docs=new Map(),set=(p,v)=>docs.set(p,structuredClone(v));
const classId='9_computer_final';
set(base,{id:scope.schoolId,active:true});
set(base+'/members/'+uid,{uid,schoolId:scope.schoolId,active:true,role:'school_admin'});
set(base+'/members/viewer1',{uid:'viewer1',schoolId:scope.schoolId,active:true,role:'viewer'});
set(base+'/subjects/computer',{schoolId:scope.schoolId,class:'9',active:true});
set(base+'/mark_settings/'+classId,{...scope,id:classId,active:true,components:[
 {key:'internal',name:'Internal',fullMarks:4},
 {key:'written',name:'Written',fullMarks:36},
 {key:'practical',name:'Practical',fullMarks:10}
]});
const entries=[];
for(let i=0;i<101;i++){
 const studentId='s'+String(i).padStart(4,'0');
 set(base+'/students/'+studentId,{schoolId:scope.schoolId,class:'9',name:'Synthetic '+i,active:true});
 entries.push({studentId,isAbsent:false,values:{internal:4,written:35,practical:9},totalObtained:48});
}
set(base+'/class_mark_drafts/'+classId,{format:'smss-v47-complete-class-draft-v1',state:'draft',
 ...scope,settingsId:classId,rosterCount:101,revision:1,updatedBy:uid,
 updatedAt:'synthetic-test',entries});
let writes=0,readCount=0;
const snap=p=>({id:p.split('/').at(-1),ref:{path:p},exists:docs.has(p),data:()=>structuredClone(docs.get(p))});
const makeQuery=(p,k=null,v=null,n=1501)=>({
 where:(field,op,value)=>{assert.equal(field,'class');assert.equal(op,'==');return makeQuery(p,field,value,n)},
 orderBy:field=>{assert.equal(field,'__name__');return makeQuery(p,k,v,n)},
 limit:size=>makeQuery(p,k,v,size),
 get:async()=>{readCount++;return {docs:[...docs].filter(([q,d])=>q.startsWith(p+'/')&&!q.slice(p.length+1).includes('/')&&(!k||d[k]===v))
  .sort(([a],[b])=>a.localeCompare(b)).slice(0,n).map(([q])=>snap(q))}}
});
const firestore={doc:p=>({path:p,get:async()=>{readCount++;return snap(p)}}),
 collection:p=>makeQuery(p),runTransaction:async fn=>fn({get:async ref=>ref.get(),set:()=>{writes++}})};
const auth={verifyIdToken:async(token,checkRevoked)=>{
 assert.equal(checkRevoked,true);
 if(token==='revoked')throw Error('revoked');
 return {uid:token,firebase:{sign_in_provider:token==='anon'?'anonymous':'password'}};
}};
const server=createV47ApiServer({auth,firestore});
try{
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const baseUrl='http://127.0.0.1:'+server.address().port+'/api/v47/publication-review?';
 const qs=new URLSearchParams(scope).toString();
 const get=(query=qs,token=uid,method='GET')=>fetch(baseUrl+query,{
  method,headers:token?{authorization:'Bearer '+token}:{}
 });
 let r=await get();assert.equal(r.status,200);
 let body=await r.json();
 assert.equal(r.headers.get('cache-control'),'no-store');
 assert.equal(body.review.rosterCount,101);
 assert.equal(body.review.digest.length,64);
 assert.equal(body.review.writeAuthorized,false);
 assert.equal(body.review.publicationAllowed,false);
 assert.equal(body.stageAuthorized,false);
 assert.equal(body.publishAuthorized,false);
 assert.equal(body.readOnly,true);
 assert.equal(JSON.stringify(body).includes('Synthetic 0'),false,'Student data not returned');
 const originalDigest=body.review.digest;
 assert.ok(readCount>=6,'School, member, subject, settings, draft and complete class query must be read');
 assert.equal(writes,0);
 assert.equal((await get(qs,null)).status,401);
 assert.equal((await get(qs,'viewer1')).status,403,'Viewer cannot request publication review');
 assert.equal((await get(qs,'revoked')).status,403);
 assert.equal((await get(qs,'anon')).status,403);
 assert.equal((await get(qs,'other')).status,403);
 assert.equal((await get(qs+'&uid=admin1')).status,400,'Caller cannot supply actor UID');
 assert.equal((await get(qs+'&schoolId=87654321')).status,400,'Duplicate scope forbidden');
 assert.equal((await get(new URLSearchParams({...scope,schoolId:'87654321'}).toString())).status,403);
 assert.equal((await get(qs,uid,'POST')).status,405);
 docs.get(base+'/members/'+uid).active=false;
 assert.equal((await get()).status,403,'Revoked member forbidden');
 docs.get(base+'/members/'+uid).active=true;
 docs.get(base+'/students/s0000').active=false;
 assert.equal((await get()).status,403,'Inactive roster forbidden');
 docs.get(base+'/students/s0000').active=true;
 docs.get(base+'/mark_settings/'+classId).components[0].fullMarks=3;
 assert.equal((await get()).status,403,'Stale mark beyond full marks denied');
 docs.get(base+'/mark_settings/'+classId).components[0].fullMarks=4;
 docs.get(base+'/class_mark_drafts/'+classId).revision=2;
 r=await get();assert.equal(r.status,200,'Fresh review required for draft revision');
 body=await r.json();assert.notEqual(body.review.digest,originalDigest);
 assert.equal(writes,0,'Publication review must never write');
 console.log('PASS V47 authenticated publication review HTTP: 101 students, verified School Admin only, revocation, roster, mark limits, revision digest, zero writes');
}finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))}
