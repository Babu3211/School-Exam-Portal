import assert from 'node:assert/strict';
import {loadCommittedOfficialClassMarks} from './server-official-marks-firestore-loader.mjs';
import {officialClassPointerId} from './server-publication-authoritative-preflight.mjs';

const scope={schoolId:'12345',classId:'9',subjectId:'computer',examId:'final'};
const uid='admin_1',publicationId='pub_00000001',digest='a'.repeat(64),count=101;
const root='schools/'+scope.schoolId;
const path=(...parts)=>root+'/'+parts.join('/');
const rows=Array.from({length:count},(_,i)=>({
 studentId:'s'+String(i).padStart(4,'0'),isAbsent:false,
 values:{internal:4,written:35,practical:9},totalObtained:48
}));
function fixture(){
 const docs=new Map(),put=(p,v)=>docs.set(p,structuredClone(v));
 const pointerId=officialClassPointerId(scope);
 const pointer={...scope,publicationId,digest,rosterCount:count};
 const publication={...scope,publicationId,state:'committed',digest,rosterCount:count,
   batchCount:2,approvedBy:uid,previousPublicationId:null,committedAt:'2026-11-23'};
 put(root,{id:scope.schoolId,active:true});
 put(path('members',uid),{uid,schoolId:scope.schoolId,active:true,role:'school_admin'});
 put(path('official_marks_pointers',pointerId),pointer);
 put(path('official_marks_publications',publicationId),publication);
 put(path('official_marks_audit',publicationId),{
   ...scope,publicationId,approvedBy:uid,action:'official_class_marks_publish',
   digest,rosterCount:count
 });
 put(path('marks_staging',publicationId),{
   format:'smss-v47-verified-staging-manifest-v1',state:'staged_verified_not_published',
   ...scope,publicationId,digest,rosterCount:count,batchCount:2,
   verifiedBy:uid,settingsRevision:'s1',rosterRevision:'r1',
   writeAuthorized:false,publicationAllowed:false
 });
 for(let i=0;i<2;i++){
  const chunk=rows.slice(i*100,(i+1)*100);
  put(path('marks_staging',publicationId,'batches','b'+String(i).padStart(4,'0')),{
   format:'smss-v47-staged-page-v1',...scope,publicationId,digest,index:i,
   count:chunk.length,firstStudentId:chunk[0].studentId,
   lastStudentId:chunk.at(-1).studentId,entries:chunk
  });
 }
 let reads=0,transactions=0;
 const firestore={
  doc:p=>({path:p}),
  runTransaction:async callback=>{
   transactions++;
   const tx={get:async ref=>{
    reads++;
    return {exists:docs.has(ref.path),data:()=>structuredClone(docs.get(ref.path))};
   }};
   return callback(tx);
  }
 };
 return {docs,put,firestore,pointerId,get reads(){return reads},get transactions(){return transactions}};
}
const run=(h,overrides={})=>loadCommittedOfficialClassMarks({
 firestore:h.firestore,...scope,actorUid:uid,...overrides
});
{
 const h=fixture(),result=await run(h);
 assert.equal(result.published,true);
 assert.equal(result.rosterCount,count);
 assert.equal(result.entries.length,count);
 assert.equal(result.entries[0].totalObtained,48);
 assert.equal(h.transactions,1);
 assert.equal(h.reads,6+2);
 assert.equal(h.docs.size,8);
}
{
 const h=fixture();
 h.put(path('members',uid),{uid,schoolId:scope.schoolId,active:true,role:'viewer'});
 assert.equal((await run(h)).entries.length,count,'Viewer can read their own school');
 h.put(path('members',uid),{uid,schoolId:scope.schoolId,active:false,role:'viewer'});
 await assert.rejects(run(h),/membership/);
}
{
 const h=fixture();
 h.docs.delete(path('official_marks_pointers',h.pointerId));
 const result=await run(h);
 assert.equal(result.published,false,'A staged-only class is NOT published');
 assert.equal(result.entries.length,0);
}
for(const mutate of [
 h=>h.docs.delete(path('official_marks_audit',publicationId)),
 h=>h.docs.get(path('official_marks_audit',publicationId)).digest='b'.repeat(64),
 h=>h.docs.get(path('official_marks_publications',publicationId)).state='draft',
 h=>h.docs.get(path('marks_staging',publicationId)).publicationAllowed=true,
 h=>h.docs.delete(path('marks_staging',publicationId,'batches','b0001')),
 h=>h.docs.get(path('marks_staging',publicationId,'batches','b0001')).entries[0].studentId='s0000',
 h=>h.docs.get(path('marks_staging',publicationId,'batches','b0000')).entries[0].values.internal=-1,
 h=>h.docs.get(path('marks_staging',publicationId,'batches','b0000')).digest='b'.repeat(64),
 h=>h.docs.get(path('official_marks_pointers',h.pointerId)).schoolId='67890',
 h=>h.docs.get(path('members',uid)).schoolId='67890',
 h=>h.docs.get(root).active=false
]){
 const h=fixture();mutate(h);
 await assert.rejects(run(h),'Tampered committed marks must never be returned');
}
await assert.rejects(run(fixture(),{schoolId:'67890'}),/membership/);
await assert.rejects(run(fixture(),{classId:'../9'}),/Verified/);
console.log('PASS trusted official marks Firestore loader: 101 rows, Viewer, unpublished, revoked membership, 11 tamper/cross-school refusals; no public API or writes');
