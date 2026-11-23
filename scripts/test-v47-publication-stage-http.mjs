import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createV47ApiServer} from '../src/v47/node-api-server.mjs';
import {officialClassPointerId} from '../v47/server-publication-authoritative-preflight.mjs';
import {loadCommittedOfficialClassMarks} from '../v47/server-official-marks-firestore-loader.mjs';
const scope={schoolId:'12345678',classId:'9',subjectId:'computer',examId:'final'};
const sid=scope.schoolId,actorUid='admin1',prefix='schools/'+sid,docId='9_computer_final';
const docs=new Map(),clone=structuredClone,put=(p,d)=>docs.set(p,clone(d));
put(prefix,{id:sid,active:true});
put(prefix+'/members/'+actorUid,{uid:actorUid,schoolId:sid,active:true,role:'school_admin'});
put(prefix+'/members/viewer1',{uid:'viewer1',schoolId:sid,active:true,role:'viewer'});
put(prefix+'/subjects/computer',{schoolId:sid,class:'9',active:true});
put(prefix+'/mark_settings/'+docId,{...scope,id:docId,active:true,components:[
 {key:'internal',name:'Internal',fullMarks:4},
 {key:'written',name:'Written',fullMarks:36},
 {key:'practical',name:'Practical',fullMarks:10}]});
const marks=[];
for(let i=0;i<101;i++){
 const studentId='s'+String(i).padStart(4,'0');
 put(prefix+'/students/'+studentId,{schoolId:sid,class:'9',active:true,name:'Synthetic '+i});
 marks.push({studentId,isAbsent:false,values:{internal:4,written:35,practical:9},totalObtained:48});
}
put(prefix+'/class_mark_drafts/'+docId,{format:'smss-v47-complete-class-draft-v1',state:'draft',
 ...scope,settingsId:docId,rosterCount:101,revision:1,updatedBy:actorUid,
 updatedAt:'synthetic-only',entries:marks});
const snapshot=p=>({exists:docs.has(p),id:p.split('/').at(-1),ref:{path:p},data:()=>clone(docs.get(p))});
const query=(p,klass=null,n=1501)=>({
 where:(name,op,value)=>{assert.equal(name,'class');assert.equal(op,'==');return query(p,value,n)},
 orderBy:name=>{assert.equal(name,'__name__');return query(p,klass,n)},
 limit:count=>query(p,klass,count),
 get:async()=>({docs:[...docs.entries()]
  .filter(([k,v])=>k.startsWith(p+'/')&&!k.slice(p.length+1).includes('/')&&
   (klass===null||v.class===klass))
  .sort(([a],[b])=>a.localeCompare(b)).slice(0,n).map(([p])=>snapshot(p))})
});
let txWrites=0;
const firestore={
 doc:p=>({path:p,get:async()=>snapshot(p)}),
 collection:p=>query(p),
 runTransaction:async fn=>{
  const pending=[];
  const tx={get:async ref=>ref.get(),set:(ref,data)=>pending.push([ref.path,clone(data)])};
  const result=await fn(tx);
  for(const [p,d]of pending){put(p,d);txWrites++}
  return result;
 }
};
const auth={verifyIdToken:async(t,revoked)=>{
 assert.equal(revoked,true);
 if(t==='revoked')throw Error('revoked');
 return {uid:t,firebase:{sign_in_provider:t==='anon'?'anonymous':'password'}};
}};
const server=createV47ApiServer({auth,firestore});
try{
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 const qs=new URLSearchParams(scope).toString();
 const review=async(token=actorUid)=>fetch(origin+'/api/v47/publication-review?'+qs,{
  headers:{authorization:'Bearer '+token}
 });
 const reviewed=await (await review()).json();
 const confirmation=Object.fromEntries(['format','schoolId','classId','subjectId','examId',
  'settingsRevision','rosterRevision','digestAlgorithm','digest'].map(k=>[k,reviewed.review[k]]));
 const post=async(data={scope,confirmation,confirmStage:true},token=actorUid,options={})=>fetch(
  origin+'/api/v47/publication/stage',{
   method:options.method??'POST',
   headers:{...(token?{authorization:'Bearer '+token}:{}),
    'content-type':options.contentType??'application/json'},
   body:options.method==='GET'?undefined:JSON.stringify(data)
  });
 const before=txWrites;
 assert.equal((await post({scope,confirmation,confirmStage:false})).status,400);
 assert.equal((await post({scope,confirmation,confirmStage:true,studentMarks:marks})).status,413,'Oversized browser marks payload rejected before parsing');
 assert.equal((await post({scope:{...scope,schoolId:'87654321'},confirmation,confirmStage:true})).status,403);
 assert.equal((await post(undefined,'viewer1')).status,403);
 assert.equal((await post(undefined,'revoked')).status,403);
 assert.equal((await post(undefined,'anon')).status,403);
 assert.equal((await post(undefined,null)).status,401);
 assert.equal((await post(undefined,actorUid,{contentType:'text/plain'})).status,415);
 assert.equal((await post(undefined,actorUid,{method:'GET'})).status,405);
 assert.equal(txWrites,before,'Invalid staging requests must make no writes');
 docs.get(prefix+'/members/'+actorUid).active=false;
 assert.equal((await post()).status,403,'Revoked membership');
 docs.get(prefix+'/members/'+actorUid).active=true;
 docs.get(prefix+'/class_mark_drafts/'+docId).revision=2;
 assert.equal((await post()).status,403,'Stale confirmed draft');
 docs.get(prefix+'/class_mark_drafts/'+docId).revision=1;
 let response=await post();
 assert.equal(response.status,202,'101-student verified review may stage');
 assert.equal(response.headers.get('cache-control'),'no-store');
 const value=await response.json();
 assert.equal(value.stage.staged,true);
 assert.equal(value.stage.rosterCount,101);
 assert.equal(value.stage.batchCount,2);
 assert.equal(value.stage.digest,confirmation.digest);
 assert.equal(value.stage.publicationAllowed,false);
 assert.equal(value.officialPublished,false);
 assert.match(value.stage.publicationId,/^pub_[a-f0-9]{32}$/);
 const path=prefix+'/marks_staging/'+value.stage.publicationId;
 assert.ok(docs.has(path));
 assert.equal(docs.get(path).state,'staged_verified_not_published');
 assert.ok(docs.has(path+'/batches/b0000'));
 assert.ok(docs.has(path+'/batches/b0001'));
 assert.equal(txWrites-before,3,'Two pages and verified manifest, no other writes');
 assert.equal([...docs.keys()].some(p=>p.includes('/official_marks_pointers/')),false);
 assert.equal([...docs.keys()].some(p=>p.includes('/official_marks_publications/')),false);
 assert.equal([...docs.keys()].some(p=>p.includes('/official_marks_audit/')),false);
 assert.equal([...docs.keys()].some(p=>p.includes('/marks/')),false);
 const stageTwo=await post();assert.equal(stageTwo.status,202);
 const second=(await stageTwo.json()).stage.publicationId;
 assert.notEqual(second,value.stage.publicationId,'Server owns unique publication IDs');
 // The default server NEVER enables official publish, even with an admin token.
 const commitData={scope,confirmation,publicationId:value.stage.publicationId,
  expectedPreviousId:null,confirmPublish:'PUBLISH OFFICIAL MARKS'};
 const callCommit=async (baseUrl,body=commitData,token=actorUid,method='POST')=>fetch(
  baseUrl+'/api/v47/publication/commit',{
   method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},
   body:method==='GET'?undefined:JSON.stringify(body)
  });
 assert.equal((await callCommit(origin)).status,503,'Default server must NOT publish');
 assert.equal([...docs.keys()].some(p=>p.includes('/official_marks_pointers/')),false);
 const enabled=createV47ApiServer({auth,firestore,publicationEnabled:true});
 try{
  enabled.listen(0,'127.0.0.1');await once(enabled,'listening');
  const approvedOrigin='http://127.0.0.1:'+enabled.address().port;
  assert.equal((await callCommit(approvedOrigin,{...commitData,confirmPublish:true})).status,400);
  assert.equal((await callCommit(approvedOrigin,commitData,'viewer1')).status,403);
  assert.equal((await callCommit(approvedOrigin,commitData,'revoked')).status,403);
  assert.equal((await callCommit(approvedOrigin,commitData,'anon')).status,403);
  assert.equal((await callCommit(approvedOrigin,{...commitData,expectedPreviousId:'pub_ghostid'})).status,403);
  assert.equal((await callCommit(approvedOrigin,{...commitData,scope:{...scope,schoolId:'87654321'}})).status,403);
  assert.equal((await callCommit(approvedOrigin,commitData,actorUid,'GET')).status,405);
  assert.equal([...docs.keys()].some(p=>p.includes('/official_marks_pointers/')),false);
  docs.get(prefix+'/class_mark_drafts/'+docId).revision=2;
  assert.equal((await callCommit(approvedOrigin)).status,403,'Changed draft invalidates consent');
  docs.get(prefix+'/class_mark_drafts/'+docId).revision=1;
  const official=await callCommit(approvedOrigin);
  assert.equal(official.status,200,'Explicit enabled server with valid full-class approval may publish');
  const out=await official.json();
  assert.equal(out.result.committed,true);
  assert.equal(out.result.rosterCount,101);
  assert.equal(out.officialPublished,true);
  assert.equal(out.cdcGradeApproved,false);
  const pointer=docs.get(prefix+'/official_marks_pointers/'+officialClassPointerId(scope));
  assert.equal(pointer.publicationId,value.stage.publicationId);
  assert.equal(docs.get(prefix+'/official_marks_publications/'+value.stage.publicationId).state,'committed');
  assert.equal(docs.get(prefix+'/official_marks_audit/'+value.stage.publicationId).action,'official_class_marks_publish');
  const shown=await loadCommittedOfficialClassMarks({firestore,...scope,actorUid:'viewer1'});
  assert.equal(shown.published,true);
  assert.equal(shown.entries.length,101);
  assert.equal((await callCommit(approvedOrigin)).status,403,'Same publication ID may not be committed twice');
  assert.equal(docs.get(prefix+'/official_marks_pointers/'+officialClassPointerId(scope)).publicationId,value.stage.publicationId);
  console.log('PASS V47 opt-in publication HTTP: 101-row staging, CAS pointer/header/audit, Viewer read, stale/duplicate/foreign/revoked denied');
 }finally{
  await new Promise((resolve,reject)=>enabled.close(e=>e?reject(e):resolve()));
 }
 console.log('PASS V47 staging HTTP: 101 students, explicit fresh review, token/role/tenant checks, server-owned IDs, default publication disabled');
}finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))}
