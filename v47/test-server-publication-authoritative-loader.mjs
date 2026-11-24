import assert from 'node:assert/strict';
import {createAdminClassPublicationReaders} from './server-publication-authoritative-loader.mjs';
import {stageTrustedClassMarks} from './server-publication-staging-executor.mjs';
import {commitTrustedOfficialClassPublication} from './server-official-publication-commit.mjs';
import {fingerprintConfiguredClassReview} from './server-class-review-fingerprint.mjs';
import {officialClassPointerId} from './server-publication-authoritative-preflight.mjs';
const scope={schoolId:'12345',classId:'9',subjectId:'computer',examId:'final'};
const actorUid='admin_1',publicationId='pub_00000001';
const base='schools/'+scope.schoolId;
const classDraftId='9_computer_final';
const clone=value=>structuredClone(value);
const names=['format','schoolId','classId','subjectId','examId','settingsRevision','rosterRevision','digestAlgorithm','digest'];

function makeDatabase(count){
 const docs=new Map();
 const put=(path,data)=>docs.set(path,clone(data));
 put(base,{id:scope.schoolId,active:true});
 put(base+'/members/'+actorUid,{uid:actorUid,role:'school_admin',schoolId:scope.schoolId,active:true});
 put(base+'/subjects/computer',{schoolId:scope.schoolId,class:'9',active:true,name:'Computer'});
 put(base+'/mark_settings/'+classDraftId,{
  id:classDraftId,...scope,active:true,components:[
   {key:'written',name:'Written',fullMarks:40},
   {key:'practical',name:'Practical',fullMarks:60}
  ]
 });
 const entries=[];
 for(let i=0;i<count;i++){
  const studentId='s'+String(i).padStart(4,'0');
  put(base+'/students/'+studentId,{
   schoolId:scope.schoolId,class:'9',active:true,name:'Student '+i
  });
  entries.push({studentId,isAbsent:false,values:{written:36,practical:55},totalObtained:91});
 }
 put(base+'/class_mark_drafts/'+classDraftId,{
  format:'smss-v47-complete-class-draft-v1',state:'draft',
  ...scope,settingsId:classDraftId,rosterCount:count,revision:1,
  updatedBy:actorUid,updatedAt:'2026-11-23T08:00:00Z',entries
 });
 const snapshot=path=>({
  id:path.split('/').at(-1),ref:{path},exists:docs.has(path),data:()=>clone(docs.get(path))
 });
 const query=(prefix,criteria={},limit=1501)=>{
  const spec={type:'query',path:prefix,criteria,cap:limit};
  spec.where=(field,operator,value)=>{
   assert.equal(field,'class');assert.equal(operator,'==');
   return query(prefix,{...criteria,[field]:value},limit);
  };
  spec.orderBy=(field)=>{assert.equal(field,'__name__');return spec;};
  spec.limit=n=>query(prefix,criteria,n);
  spec.get=async()=>{
   const prefixPath=prefix+'/';
   const results=[...docs].filter(([path,data])=>
    path.startsWith(prefixPath)&&!path.slice(prefixPath.length).includes('/')&&
    Object.entries(criteria).every(([k,v])=>data[k]===v)
   ).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit);
   return {docs:results.map(([path])=>snapshot(path))};
  };
  return spec;
 };
 let writes=0,queryReads=0,transactionQueryReads=0;
 const db={
  doc:path=>({type:'document',path,get:async()=>snapshot(path)}),
  collection:path=>query(path),
  runTransaction:async callback=>{
   const pending=[];
   const tx={
    get:async ref=>{
     if(pending.length)throw Error('Firestore forbids reads after transaction writes');
     if(ref.type==='query'){transactionQueryReads++;return ref.get();}
     return ref.get();
    },
    set:(ref,value)=>{assert.equal(ref.type,'document');pending.push([ref.path,clone(value)])}
   };
   const result=await callback(tx);
   for(const [path,data] of pending)put(path,data);
   writes+=pending.length;
   return result;
  }
 };
 const readers=createAdminClassPublicationReaders({firestore:db,...scope,actorUid});
 const getSource=async()=>{queryReads++;return readers.loadAuthoritative({schoolId:scope.schoolId,uid:actorUid})};
 return {docs,put,db,readers,getSource,get writes(){return writes},get transactionQueryReads(){return transactionQueryReads},get queryReads(){return queryReads}};
}
async function createStaged(count){
 const h=makeDatabase(count),readers=h.readers;
 const authoritative=await h.getSource();
 assert.equal(authoritative.expectedStudentIds.length,count);
 assert.equal(authoritative.drafts.length,count);
 assert.equal(authoritative.settingsRevision.length,65);
 assert.equal(authoritative.rosterRevision.length,65);
 const review=fingerprintConfiguredClassReview(authoritative);
 const confirmation=Object.fromEntries(names.map(name=>[name,review[name]]));
 const options={...readers,publicationId,confirmation};
 const stage=await stageTrustedClassMarks(options);
 assert.equal(stage.staged,true);
 assert.equal(stage.publicationAllowed,false);
 return Object.assign(h,{options});
}
for(const size of [1,101,500,1500]){
 const h=await createStaged(size);
 const before=h.writes;
 const published=await commitTrustedOfficialClassPublication(h.options);
 assert.equal(published.committed,true);
 assert.equal(published.rosterCount,size);
 assert.equal(h.writes-before,4,'Only official pointer, header, audit and current read view written atomically');
 const view=h.docs.get(base+'/official_read_views/'+officialClassPointerId(scope));
 assert.equal(view.publicationId,publicationId);assert.equal(view.entries.length,size);
 assert.equal(view.contentDigest,h.docs.get(base+'/official_marks_pointers/'+officialClassPointerId(scope)).contentDigest);
 assert.equal(h.transactionQueryReads>0,true,'Real roster query must be read INSIDE Firestore transaction');
 assert.equal(h.docs.get(base+'/official_marks_pointers/'+officialClassPointerId(scope)).publicationId,publicationId);
 const lastWrites=h.writes;
 await assert.rejects(commitTrustedOfficialClassPublication(h.options),/Concurrent publication/);
 assert.equal(h.writes,lastWrites);
}
{
 const h=await createStaged(101),before=h.writes;
 h.docs.get(base+'/students/s0000').active=false;
 await assert.rejects(commitTrustedOfficialClassPublication(h.options),/inactive|roster|changed|class/i);
 assert.equal(h.writes,before);
}
{
 const h=await createStaged(101),before=h.writes;
 h.docs.get(base+'/students/s0000').schoolId='67890';
 await assert.rejects(commitTrustedOfficialClassPublication(h.options),/cross-school|school|roster/i);
 assert.equal(h.writes,before);
}
{
 const h=await createStaged(101),before=h.writes;
 h.docs.get(base+'/class_mark_drafts/'+classDraftId).revision=2;
 await assert.rejects(commitTrustedOfficialClassPublication(h.options),/stale|altered|changed/i);
 assert.equal(h.writes,before,'Draft revision changed without marks must still invalidate approval');
}
{
 const h=await createStaged(101),before=h.writes;
 h.docs.get(base+'/mark_settings/'+classDraftId).components[0].fullMarks=35;
 await assert.rejects(commitTrustedOfficialClassPublication(h.options),/Invalid|Examination|review|settings|Out of range|stale|altered/i);
 assert.equal(h.writes,before);
}
{
 const h=await createStaged(101),before=h.writes;
 h.docs.get(base+'/members/'+actorUid).active=false;
 await assert.rejects(commitTrustedOfficialClassPublication(h.options),/Admin/);
 assert.equal(h.writes,before);
}
{
 const h=await createStaged(101),before=h.writes;
 const doc=h.docs.get(base+'/class_mark_drafts/'+classDraftId);
 doc.entries[0].values.written=90;
 await assert.rejects(commitTrustedOfficialClassPublication(h.options),/Draft|Examination|range|incomplete/i);
 assert.equal(h.writes,before);
}
{
 const h=await createStaged(1);
 h.put(base+'/students/s9999',{schoolId:scope.schoolId,class:'9',active:true,name:'New Student'});
 await assert.rejects(commitTrustedOfficialClassPublication(h.options),/changed|roster|stale|altered|Draft/i);
}
{
 const h=makeDatabase(1501),before=h.writes;
 await assert.rejects(h.getSource(),/1500/);
 assert.equal(h.writes,before);
}
{
 const h=makeDatabase(1);
 await assert.rejects(h.readers.loadAuthoritative({schoolId:'67890',uid:actorUid}),/Cross-school/);
 await assert.rejects(h.readers.loadTransactionalAuthoritative({
  transaction:{get:async()=>{throw Error('should not reach transaction');}},
  schoolId:scope.schoolId,classId:'10',subjectId:'computer',examId:'final',uid:actorUid
 }),/Cross-school/);
}
console.log('V47 Firebase Admin authoritative loader: real V47 school/member/subject/settings/complete-class Draft and 1/101/500/1500 roster query, transaction-scoped reads and mutation denials PASSED');
