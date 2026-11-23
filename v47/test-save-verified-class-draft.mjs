import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {saveVerifiedCompleteClassDraft} from './save-verified-class-draft.mjs';
const schoolId='12345678',classId='9',subjectId='computer',examId='final',uid='adminA';
const actor={uid,active:true,role:'school_admin',schoolId};
const settings={id:'9_computer_final',schoolId,classId,subjectId,examId,active:true,components:[
 {key:'participation',name:'Participation',fullMarks:7},
 {key:'practical',name:'Practical',fullMarks:63},
 {key:'term',name:'Term',fullMarks:30}
]};
const otherSubject={schoolId,class:classId,active:true,name:'Computer'};
const ids=['s1','s2','s3','s4'];
const marks=id=>({studentId:id,values:{participation:7,practical:63,term:30}});
function fixture(opts={}){
 const store=new Map([
  ['schools/'+schoolId,{id:schoolId,active:true}],
  ['schools/'+schoolId+'/members/'+uid,{uid,schoolId,role:'school_admin',active:true}],
  ['schools/'+schoolId+'/subjects/'+subjectId,otherSubject],
  ['schools/'+schoolId+'/mark_settings/9_computer_final',settings],
  ...ids.map(id=>['schools/'+schoolId+'/students/'+id,{schoolId,class:classId,active:true,name:id}])
 ]);
 if(opts.existing)store.set('schools/'+schoolId+'/class_mark_drafts/9_computer_final',opts.existing);
 const writes=[];
 const snapshot=key=>({exists:()=>store.has(key),data:()=>store.get(key)});
 const api={
  doc:(_db,...s)=>s.join('/'),getDoc:async key=>snapshot(key),
  collection:(_db,...s)=>s.join('/'),
  where:(k,o,v)=>({where:[k,o,v]}),orderBy:x=>({orderBy:x}),limit:x=>({limit:x}),
  startAfter:x=>({cursor:x}),query:(...args)=>args,
  getDocs:async q=>{
   const after=q.find(x=>x?.cursor)?.cursor?.id??null;
   const page=ids.filter(id=>after===null||id>after);
   return {docs:page.map(id=>({id,ref:{path:'schools/'+schoolId+'/students/'+id},
    data:()=>store.get('schools/'+schoolId+'/students/'+id)}))};
  },
  serverTimestamp:()=>({server:true}),
  runTransaction:async(_db,fn)=>{
   const pending=[],tx={get:async key=>snapshot(key),set:(key,value)=>pending.push([key,value])};
   if(opts.beforeTx)opts.beforeTx(store);
   const ret=await fn(tx);
   for(const [key,val] of pending){store.set(key,val);writes.push([key,val]);}
   return ret;
  }
 };
 return {api,writes,store};
}
const context={db:{},auth:{currentUser:{uid}},actor,schoolId,classId,subjectId,examId,drafts:ids.map(marks)};
{
 const f=fixture();
 const result=await saveVerifiedCompleteClassDraft({...context,api:f.api});
 assert.equal(result.savedDraft,true);assert.equal(result.rosterCount,4);
 assert.equal(result.revision,1);assert.equal(result.publicationAllowed,false);
 assert.equal(result.officialMarksWritten,false);
 assert.equal(f.writes.length,1,'One class document, never per-student marks');
 assert.equal(f.writes[0][0],'schools/'+schoolId+'/class_mark_drafts/9_computer_final');
 assert.equal(f.writes[0][1].entries.length,4);
 assert.equal(f.writes[0][1].updatedAt.server,true);
 assert(!f.writes.some(([key])=>key.includes('/marks/')));
}
for(const [override,regex] of [
 [{actor:{...actor,role:'viewer'}},/School Admin/],
 [{actor:{...actor,role:'teacher'}},/School Admin/],
 [{actor:{...actor,active:false}},/School Admin/],
 [{schoolId:'87654321'},/School Admin/],
 [{drafts:ids.slice(1).map(marks)},/Complete class/],
 [{drafts:[...ids.slice(1),ids[1]].map(marks)},/Duplicate/],
 [{drafts:ids.map(id=>id==='s4'?{studentId:id,values:{participation:8,practical:63,term:30}}:marks(id))},/Complete class/]
]){
 const f=fixture();
 await assert.rejects(saveVerifiedCompleteClassDraft({...context,...override,api:f.api}),regex);
 assert.equal(f.writes.length,0);
}
{
 const f=fixture({beforeTx:store=>store.set('schools/'+schoolId+'/members/'+uid,{uid,role:'viewer',schoolId,active:true})});
 await assert.rejects(saveVerifiedCompleteClassDraft({...context,api:f.api}),/permission changed/);
 assert.equal(f.writes.length,0);
}
{
 const f=fixture({existing:{format:'smss-v47-complete-class-draft-v1',state:'draft',schoolId,classId,subjectId,examId,settingsId:'9_computer_final',revision:1}});
 await assert.rejects(saveVerifiedCompleteClassDraft({...context,api:f.api}),/changed in another session/);
 assert.equal(f.writes.length,0);
 const success=await saveVerifiedCompleteClassDraft({...context,api:f.api,expectedRevision:1});
 assert.equal(success.revision,2);assert.equal(f.writes.length,1);
}
{
 const f=fixture();
 const auth={currentUser:{uid}};
 f.api.getDocs=async(...args)=>{auth.currentUser={uid:'intruder'};return {docs:[]}};
 await assert.rejects(saveVerifiedCompleteClassDraft({...context,auth,api:f.api}),/session changed|Authentication changed|roster/i);
 assert.equal(f.writes.length,0);
}
// The successful Draft commit must be independently re-read and the
// complete class roster verified after committing.
{
 const f=fixture(),before=f.api.getDocs;
 let rosterReads=0,docReads=0;
 f.api.getDocs=async (...args)=>{rosterReads++;return before(...args)};
 const getDoc=f.api.getDoc;
 f.api.getDoc=async key=>{if(key==='schools/'+schoolId+'/class_mark_drafts/9_computer_final')docReads++;return getDoc(key)};
 const result=await saveVerifiedCompleteClassDraft({...context,api:f.api});
 assert.equal(result.rosterReverified,true);
 assert.equal(rosterReads,2);
 assert.equal(docReads,1);
 assert.equal(f.writes.length,1);
}
// Successful commits cannot be called rolled back when a final network read,
// enrollment change, or Firebase identity switch prevents verification.
for(const state of ['offline','enrollment','auth-switched','tampered-revision']){
 const f=fixture(),auth={currentUser:{uid}};
 let wrote=false;
 const oldTx=f.api.runTransaction;
 f.api.runTransaction=async (...args)=>{const result=await oldTx(...args);wrote=true;
  if(state==='enrollment')f.store.set('schools/'+schoolId+'/students/s5',{schoolId,class:classId,active:true,name:'late-student'});
  if(state==='auth-switched')auth.currentUser={uid:'different-account'};
  if(state==='tampered-revision')f.store.get('schools/'+schoolId+'/class_mark_drafts/9_computer_final').revision=77;
  return result;
 };
 const oldGetDoc=f.api.getDoc;
 f.api.getDoc=async key=>{
  if(wrote&&state==='offline'&&key.endsWith('/class_mark_drafts/9_computer_final'))throw Error('post-commit network unavailable');
  return oldGetDoc(key);
 };
 // This mock enumerates the actual store so newly enrolled children appear.
 if(state==='enrollment')f.api.getDocs=async()=>({docs:[...f.store.entries()]
  .filter(([key,data])=>key.startsWith('schools/'+schoolId+'/students/')&&data.class===classId)
  .map(([key,data])=>({id:key.split('/').at(-1),data:()=>data}))});
 await assert.rejects(saveVerifiedCompleteClassDraft({...context,api:f.api,auth}),e=>{
  assert.equal(e.name,'ClassDraftPostSaveReviewError',state);
  assert.equal(e.committed,true,state);
  assert.equal(e.reviewRequired,true,state);
  assert.equal(e.revision,1,state);
  assert.equal(e.rosterCount,4,state);
  return true;
 });
 assert.equal(f.writes.length,1,'Committed class Draft must not be misrepresented as failed: '+state);
}
{
 const f=fixture();
 const getDoc=f.api.getDoc;
 let txStarted=false;
 f.api.runTransaction=async (...args)=>{txStarted=true;throw Error('transaction network unavailable')};
 await assert.rejects(saveVerifiedCompleteClassDraft({...context,api:f.api}),/transaction network unavailable/);
 assert.equal(txStarted,true);
 assert.equal(f.writes.length,0);
}
const source=readFileSync(new URL('./save-verified-class-draft.mjs',import.meta.url),'utf8');
assert.doesNotMatch(source,/['"]marks['"]|['"]component_marks['"]|publishedAt|gradeSheet/);
assert.match(source,/runTransaction/);
assert.match(source,/expectedRevision/);
console.log('PASS verified full-class Draft single-transaction save: authorized, bounded, revision-safe, no marks publication');
