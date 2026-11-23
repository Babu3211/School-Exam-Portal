import assert from 'node:assert/strict';
import {stageTrustedClassMarks} from './server-publication-staging-executor.mjs';
import {fingerprintConfiguredClassReview} from './server-class-review-fingerprint.mjs';
import {loadTrustedPublicationPreflight,officialClassPointerId} from './server-publication-authoritative-preflight.mjs';
const scope={schoolId:'12345',classId:'9',subjectId:'computer',examId:'final'};
const actor={uid:'admin_1',role:'school_admin',active:true,schoolId:scope.schoolId};
const ids=Array.from({length:101},(_,i)=>'student'+String(i).padStart(4,'0'));
const input={...scope,actor,settingsRevision:'s1',rosterRevision:'r1',
 settings:{...scope,active:true,components:[
  {key:'written',name:'Written',fullMarks:40},{key:'practical',name:'Practical',fullMarks:60}
 ]},expectedStudentIds:ids,drafts:ids.map(studentId=>({studentId,values:{written:36,practical:55}}))};
const store=()=>{
 const docs=new Map();
 const snap=ref=>({exists:()=>docs.has(ref),data:()=>structuredClone(docs.get(ref))});
 const api={doc:(_db,...segments)=>segments.join('/'),
  getDoc:async ref=>snap(ref),
  runTransaction:async(_db,cb)=>{
   const writes=[],tx={get:async ref=>snap(ref),set:(ref,value)=>writes.push([ref,value])};
   const result=await cb(tx);
   for(const [ref,value] of writes)docs.set(ref,structuredClone(value));
   return result;
  }
 };
 return {docs,api};
};
const makeReview=input=>Object.fromEntries(
 ['format','schoolId','classId','subjectId','examId','settingsRevision','rosterRevision','digestAlgorithm','digest']
 .map(k=>[k,fingerprintConfiguredClassReview(input)[k]]));
const approval=makeReview(input),publicationId='pub_00000001';
const goodStore=store();
const options=(dbStore=goodStore,overrides={})=>({
 db:{},api:dbStore.api,...scope,publicationId,actorUid:actor.uid,
 confirmation:approval,verifyAdmin:async()=>({...actor,schoolActive:true}),
 loadAuthoritative:async()=>input,...overrides
});
await stageTrustedClassMarks(options(goodStore));
const count=goodStore.docs.size;
const checked=await loadTrustedPublicationPreflight(options());
assert.equal(count,3,'101 students need two staged batch documents and one manifest');
assert.equal(checked.valid,true);
assert.equal(checked.rosterCount,101);assert.equal(checked.batchCount,2);
assert.equal(checked.digest,approval.digest);
assert.equal(checked.publicationAllowed,false);assert.equal(checked.writeAuthorized,false);
assert.equal(goodStore.docs.size,count,'Preflight must not modify Firestore');
assert.equal(checked.pointerId,officialClassPointerId(scope));
assert.deepEqual(checked.pointerPath,['official_marks_pointers',checked.pointerId]);
assert.equal(checked.pointerId.length,64);
assert.notEqual(officialClassPointerId({...scope,subjectId:'english'}),checked.pointerId);
for(const bad of [{classId:'../x'},{subjectId:'../../marks'},{examId:'bad/x'}])
 assert.throws(()=>officialClassPointerId({...scope,...bad}),/scope/);
const path='schools/12345/marks_staging/pub_00000001';
const page=path+'/batches/b0000';
const pointer='schools/12345/official_marks_pointers/'+checked.pointerId;
const copy=()=>new Map([...goodStore.docs].map(([k,v])=>[k,structuredClone(v)]));
const mutatedStore=(mutate)=>{
 const dbStore=store();for(const [k,v] of copy())dbStore.docs.set(k,v);
 mutate(dbStore.docs);return dbStore;
};
for(const [label,mutator,error] of [
 ['manifest deleted',d=>d.delete(path),/manifest/],
 ['wrong tenant',d=>{d.get(path).schoolId='67890'},/manifest/],
 ['manifest still not complete',d=>{d.get(path).state='uploading'},/manifest/],
 ['absent batch',d=>d.delete(page),/staged page/],
 ['score changed',d=>{d.get(page).entries[0].values.written=35},/altered/],
 ['unexpected property',d=>{d.get(page).extra='untrusted'},/staged page/]
]){
 const bad=mutatedStore(mutator);
 await assert.rejects(loadTrustedPublicationPreflight(options(bad)),error,label);
}
const oldPointer={...scope,publicationId:'pub_previous01',digest:'b'.repeat(64),rosterCount:101};
const withPointer=mutatedStore(d=>d.set(pointer,oldPointer));
await assert.rejects(loadTrustedPublicationPreflight(options(withPointer)),/Concurrent publication/);
const changed=await loadTrustedPublicationPreflight(options(withPointer,{expectedPreviousId:'pub_previous01'}));
assert.equal(changed.previousPublicationId,'pub_previous01');
await assert.rejects(loadTrustedPublicationPreflight(options(goodStore,{
 confirmation:{...approval,digest:'c'.repeat(64)}
})),/stale or altered/);
for(const role of ['viewer','teacher']){
 let snapshots=0;
 await assert.rejects(loadTrustedPublicationPreflight(options(goodStore,{
  verifyAdmin:async()=>{snapshots++;return {...actor,role,schoolActive:true}}
 })),/School Admin/);
 assert.equal(snapshots,1);
}
let calls=0;
await assert.rejects(loadTrustedPublicationPreflight(options(goodStore,{
 loadAuthoritative:async()=>{
  calls++;
  return calls===1?input:{...input,rosterRevision:'r2'};
 }
})),/changed during publication review/);
const cross=mutatedStore(()=>{});
await assert.rejects(loadTrustedPublicationPreflight(options(cross,{schoolId:'67890'})),/Authoritative school|Active School Admin/);
await assert.rejects(loadTrustedPublicationPreflight(options(goodStore,{publicationId:'../cross'})),/Valid publication/);
const existing=goodStore.docs.get(path);
assert.equal(existing.state,'staged_verified_not_published','Never publish as a side effect');
assert.ok([...goodStore.docs.keys()].every(p=>!p.includes('/official_marks_publications/')));
console.log('PASS server preflight reads verified 101-student staging and CAS pointer, rejects tampering, stale review and cross-school roles; no publication writes');
