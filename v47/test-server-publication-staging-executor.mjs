import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stageTrustedClassMarks} from './server-publication-staging-executor.mjs';
const scope={schoolId:'12345',classId:'9',subjectId:'computer',examId:'final'};
const actor={uid:'admin_1',role:'school_admin',active:true,schoolId:scope.schoolId};
const ids=Array.from({length:1500},(_,i)=>'student'+String(i).padStart(4,'0'));
const input={...scope,actor,settingsRevision:'settings_1',rosterRevision:'roster_1',
 settings:{...scope,active:true,components:[{key:'written',name:'Written',fullMarks:36},{key:'practical',name:'Practical',fullMarks:64}]},
 expectedStudentIds:ids,drafts:ids.map(studentId=>({studentId,values:{written:30,practical:50}}))};
const makeStore=()=>{
 const docs=new Map();let attempt=0,failAt=0;
 const snapshot=ref=>({exists:()=>docs.has(ref),data:()=>structuredClone(docs.get(ref))});
 const api={
  doc:(_db,...parts)=>parts.join('/'),
  getDoc:async ref=>snapshot(ref),
  runTransaction:async(_db,callback)=>{
   attempt++;
   if(attempt===failAt)throw Error('staging network interrupted');
   const writes=[];
   const result=await callback({get:async ref=>snapshot(ref),set:(ref,data)=>writes.push([ref,data])});
   for(const [ref,data] of writes)docs.set(ref,structuredClone(data));
   return result;
  }
 };
 return {docs,api,get attempts(){return attempt},setFailure:n=>{failAt=n}};
};
const makeOptions=(store,overrides={})=>({
 db:{},api:store.api,schoolId:scope.schoolId,publicationId:'pub_00000001',actorUid:actor.uid,
 verifyAdmin:async()=>({...actor,schoolActive:true}),
 loadAuthoritative:async()=>input,...overrides
});
const stage=makeStore(),progress=[];
const complete=await stageTrustedClassMarks(makeOptions(stage,{onProgress:p=>progress.push(p)}));
assert.equal(complete.staged,true);assert.equal(complete.rosterCount,1500);
assert.equal(complete.batchCount,15);assert.equal(complete.existingPages,0);
assert.equal(complete.publicationAllowed,false);assert.equal(complete.writeAuthorized,false);
assert.equal(stage.docs.size,15);assert.equal(progress.at(-1).staged,1500);
assert.ok([...stage.docs.keys()].every(path=>path.startsWith('schools/12345/marks_staging/pub_00000001/batches/')));
assert.ok([...stage.docs.keys()].every(path=>!path.includes('/marks/')&&!path.includes('pointers')));
const again=await stageTrustedClassMarks(makeOptions(stage));
assert.equal(again.existingPages,15,'Idempotent restart must not duplicate staging documents');
assert.equal(stage.docs.size,15);
const interrupted=makeStore();interrupted.setFailure(3);
await assert.rejects(stageTrustedClassMarks(makeOptions(interrupted)),/staging network interrupted/);
assert.equal(interrupted.docs.size,2,'Failed staging must remain invisible and resumable');
interrupted.setFailure(0);
assert.equal((await stageTrustedClassMarks(makeOptions(interrupted))).existingPages,2);
assert.equal(interrupted.docs.size,15);
const tampered=makeStore();
await stageTrustedClassMarks(makeOptions(tampered));
const first=[...tampered.docs.keys()][0],wrong=tampered.docs.get(first);
wrong.entries[0].values.written=999;
await assert.rejects(stageTrustedClassMarks(makeOptions(tampered)),/different page/);
const revoked=makeStore();let verified=0;
await assert.rejects(stageTrustedClassMarks(makeOptions(revoked,{verifyAdmin:async()=>({
 ...actor,schoolActive:true,active:++verified<5
})})),/Active School Admin/);
assert.ok(revoked.docs.size<15,'Revoked membership must stop further staged transactions');
const switched=makeStore();let loads=0;
await assert.rejects(stageTrustedClassMarks(makeOptions(switched,{loadAuthoritative:async()=>{
 loads++;return loads===1?input:{...input,rosterRevision:'roster_2'};
}})),/changed during staging/);
assert.equal(switched.docs.size,15,'Stale staged pages must not become official marks');
for(const bad of [
 {schoolId:'wrong'}, {publicationId:'../other'}, {actorUid:'../other'},
 {verifyAdmin:async()=>({...actor,role:'viewer',schoolActive:true})},
 {verifyAdmin:async()=>({...actor,schoolActive:false})},
 {loadAuthoritative:async()=>({...input,schoolId:'67890'})}
]){
 const store=makeStore();
 await assert.rejects(stageTrustedClassMarks(makeOptions(store,bad)));
 assert.equal(store.docs.size,0,'Invalid staging request must not write any pages');
}
const hosting=readFileSync(new URL('./build-hosting.mjs',import.meta.url),'utf8');
assert.match(hosting,/name\.startsWith\('server-'\)/,'No trusted server publication code in browser bundle');
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
assert.match(rules,/match \/marks_staging\/\{publicationId\}/,'Explicit trusted-only staging path required');
assert.match(rules,/match \/batches\/\{batchId\}/,'Stage batch path must be denied');
assert.match(rules,/match \/batches\/\{batchId\} \{\s*allow read, write: if false;/,'No client may access staged batches');
console.log('PASS trusted-server staging: 1500 rows, verified admin, resumable 15 batches, tamper/revision/revocation fail closed; never publishes');
