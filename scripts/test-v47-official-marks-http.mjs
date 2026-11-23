// End-to-end Node HTTP contract, synthetic V47 data only, no Firebase credentials.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createV47ApiServer} from '../src/v47/node-api-server.mjs';
import {computePublishedPagesDigest} from '../v47/server-publication-content-digest.mjs';
import {officialClassPointerId} from '../v47/server-publication-authoritative-preflight.mjs';

const scope={schoolId:'12345678',classId:'9',subjectId:'computer',examId:'final'};
const uid='viewer1',publicationId='pub_00000001',digest='a'.repeat(64);
const root='schools/'+scope.schoolId,path=(...p)=>root+'/'+p.join('/');
const docs=new Map(),set=(p,v)=>docs.set(p,structuredClone(v));
const rows=Array.from({length:101},(_,i)=>({studentId:'s'+String(i).padStart(4,'0'),isAbsent:false,
 values:{internal:4,written:35,practical:9},totalObtained:48}));
set(root,{id:scope.schoolId,active:true,status:'active'});
set(path('members',uid),{uid,schoolId:scope.schoolId,role:'viewer',active:true});
const pointerId=officialClassPointerId(scope);
const contentDigest=computePublishedPagesDigest(Array.from({length:2},(_,i)=>{
 const chunk=rows.slice(i*100,(i+1)*100);
 return {index:i,count:chunk.length,firstStudentId:chunk[0].studentId,
  lastStudentId:chunk.at(-1).studentId,entries:chunk};
}));
set(path('official_marks_pointers',pointerId),{...scope,publicationId,digest,contentDigest,rosterCount:101});
set(path('official_marks_publications',publicationId),{...scope,publicationId,digest,contentDigest,rosterCount:101,
 state:'committed',batchCount:2,approvedBy:'admin1'});
set(path('official_marks_audit',publicationId),{...scope,publicationId,digest,contentDigest,rosterCount:101,
 approvedBy:'admin1',action:'official_class_marks_publish'});
set(path('marks_staging',publicationId),{...scope,publicationId,digest,rosterCount:101,
 format:'smss-v47-verified-staging-manifest-v1',state:'staged_verified_not_published',
 batchCount:2,writeAuthorized:false,publicationAllowed:false});
for(let i=0;i<2;i++){
 const chunk=rows.slice(i*100,(i+1)*100);
 set(path('marks_staging',publicationId,'batches','b'+String(i).padStart(4,'0')),
  {format:'smss-v47-staged-page-v1',...scope,publicationId,digest,index:i,count:chunk.length,
   firstStudentId:chunk[0].studentId,lastStudentId:chunk.at(-1).studentId,entries:chunk});
}
let lookups=0;
const firestore={
 doc:p=>({path:p,get:async()=>({exists:docs.has(p),data:()=>structuredClone(docs.get(p))})}),
 collection:()=>({}),
 runTransaction:async callback=>callback({
  get:async ref=>{lookups++;return {exists:docs.has(ref.path),data:()=>structuredClone(docs.get(ref.path))};}
 })
};
const auth={verifyIdToken:async(t,checkRevoked)=>{
 assert.equal(checkRevoked,true,'Always reject revoked Firebase Auth tokens');
 if(t==='revoked')throw Error('Revoked token');
 return {uid:t==='other'?'other':uid,firebase:{sign_in_provider:t==='anon'?'anonymous':'password'}};
}};
const server=createV47ApiServer({auth,firestore});
try{
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port+'/api/v47/official-marks';
 const params=new URLSearchParams(scope).toString();
 const get=(query=params,token='viewer1',method='GET')=>fetch(base+'?'+query,{method,headers:token?{authorization:'Bearer '+token}:{}});
 let r=await get();assert.equal(r.status,200);
 assert.equal(r.headers.get('cache-control'),'no-store');
 let body=await r.json();assert.equal(body.result.published,true);
 assert.equal(body.result.entries.length,101);
 assert.deepEqual(body.result.entries[0].values,{internal:4,written:35,practical:9});
 assert.equal(body.cdcGradeApproved,false);
 assert.equal(lookups,8);
 assert.equal((await get(params,null)).status,401,'No bearer token');
 assert.equal((await get(params,'revoked')).status,403,'Revoked token');
 assert.equal((await get(params,'anon')).status,403,'Anonymous account');
 assert.equal((await get(params,'other')).status,403,'Unassigned account');
 assert.equal((await get(params+'&uid=viewer1')).status,400,'Reject injected UID');
 assert.equal((await get(params+'&schoolId=87654321')).status,400,'Reject duplicate school ID');
 assert.equal((await get(new URLSearchParams({...scope,schoolId:'87654321'}).toString())).status,403,'No cross-tenant result');
 assert.equal((await get(new URLSearchParams({...scope,classId:'10'}).toString())).status,200,'Unpublished valid class is not an error');
 const unpublished=await (await get(new URLSearchParams({...scope,classId:'10'}).toString())).json();
 assert.equal(unpublished.result.published,false);
 assert.equal((await get(params,'viewer1','POST')).status,405,'No writes');
 docs.get(path('members',uid)).active=false;
 assert.equal((await get()).status,403,'Revoked membership');
 docs.get(path('members',uid)).active=true;
 docs.get(path('marks_staging',publicationId,'batches','b0001')).entries[0].values.internal=100;
 assert.equal((await get()).status,403,'Reject invalid official marks');
 docs.get(path('marks_staging',publicationId,'batches','b0001')).entries[0].values.internal=3;
 docs.get(path('marks_staging',publicationId,'batches','b0001')).entries[0].totalObtained=47;
 assert.equal((await get()).status,403,'Reject valid-looking tampered marks by immutable content hash');
 console.log('PASS V47 official marks HTTP: 101 real-shaped component marks, scoped Viewer, revoked token/role, unpublished state, tamper refusal; read-only');
}finally{
 await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
}
