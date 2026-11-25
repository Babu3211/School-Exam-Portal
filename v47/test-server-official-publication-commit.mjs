import assert from 'node:assert/strict';
import {stageTrustedClassMarks} from './server-publication-staging-executor.mjs';
import {fingerprintConfiguredClassReview} from './server-class-review-fingerprint.mjs';
import {commitTrustedOfficialClassPublication} from './server-official-publication-commit.mjs';
import {officialClassPointerId} from './server-publication-authoritative-preflight.mjs';
import {computeOfficialSettingsDigest} from './server-publication-content-digest.mjs';
import {resolveOfficialClassMarks} from './server-official-marks-reader.mjs';
import {loadSparkCommittedReport} from './spark-committed-report.mjs';
import {iemisEntrySchema} from './iemis-entry.js';
import {legacyGradePreviewExcel} from './legacy-grade-report-preview.mjs';

const scope={schoolId:'12345',classId:'9',subjectId:'computer',examId:'final'};
const actor={uid:'admin_1',role:'school_admin',active:true,schoolId:scope.schoolId};
const prefix='schools/12345/';
const publicationId='pub_00000001';
const clone=v=>structuredClone(v);
const snap=(docs,ref)=>({exists:()=>docs.has(ref),data:()=>clone(docs.get(ref))});
function harness(count,reportFixture=false){
 const studentIds=Array.from({length:count},(_,i)=>'s'+String(i).padStart(4,'0'));
 const settings={...scope,active:true,components:[
  {key:'written',name:'Written',fullMarks:40},
  {key:'practical',name:'Practical',fullMarks:60}
 ]};
 if(reportFixture)settings.components=iemisEntrySchema('9','annual','Computer Science').map((c,i)=>({key:'f'+i,name:c.name,fullMarks:c.max}));
 const drafts=studentIds.map((studentId,i)=>reportFixture?(i===0?{studentId,isAbsent:true}:{studentId,values:Object.fromEntries(settings.components.map(c=>[c.key,c.fullMarks]))}):{studentId,values:{written:36,practical:55}});
 const input={...scope,actor,settingsRevision:'s1',rosterRevision:'r1',
  settings,expectedStudentIds:studentIds,drafts};
 const docs=new Map([
  [prefix.slice(0,-1),{active:true}],
  [prefix+'members/'+actor.uid,{...actor}],
  [prefix+'mark_settings/class9_computer_final',{revision:'s1',settings}],
  [prefix+'roster_snapshots/9',{revision:'r1',ids:studentIds}],
  [prefix+'official_drafts/9_computer_final',{drafts}]
 ]);
 let writeCount=0;
 const api={
  doc:(_db,...path)=>path.join('/'),
  getDoc:async ref=>snap(docs,ref),
  runTransaction:async(_db,callback)=>{
   const writes=[];
   const tx={
    get:async ref=>{if(writes.length)throw Error('Firestore transaction read after write');return snap(docs,ref)},
    set:(ref,data)=>writes.push([ref,clone(data)])
   };
   const result=await callback(tx);
   for(const [ref,data] of writes)docs.set(ref,data);
   writeCount+=writes.length;
   return result;
  }
 };
 const confirmation=Object.fromEntries(
  ['format','schoolId','classId','subjectId','examId','settingsRevision','rosterRevision','digestAlgorithm','digest']
  .map(k=>[k,fingerprintConfiguredClassReview(input)[k]])
 );
 const verifyAdmin=async()=>({...docs.get(prefix+'members/'+actor.uid),
  schoolActive:docs.get(prefix.slice(0,-1))?.active===true});
 const loadAuthoritative=async()=>clone(input);
 // A stand-in for the production transactional loader: all three source
 // documents are obtained using transaction.get, not from the browser.
 const loadTransactionalAuthoritative=async({transaction})=>{
  const settingsDoc=(await transaction.get(prefix+'mark_settings/class9_computer_final')).data();
  const rosterDoc=(await transaction.get(prefix+'roster_snapshots/9')).data();
  const draftsDoc=(await transaction.get(prefix+'official_drafts/9_computer_final')).data();
  return {...scope,actor:{...actor},settingsRevision:settingsDoc.revision,
   rosterRevision:rosterDoc.revision,settings:settingsDoc.settings,
   expectedStudentIds:rosterDoc.ids,drafts:draftsDoc.drafts};
 };
 const options=(extra={})=>({db:{},api,...scope,publicationId,actorUid:actor.uid,
  confirmation,verifyAdmin,loadAuthoritative,loadTransactionalAuthoritative,...extra});
 return {docs,api,input,options,get writes(){return writeCount}};
}
async function staged(size){
 const h=harness(size);
 await stageTrustedClassMarks(h.options());
 assert.ok(h.docs.has(prefix+'marks_staging/'+publicationId));
 assert.ok(!h.docs.has(prefix+'official_marks_pointers/'+officialClassPointerId(scope)));
 return h;
}
for(const size of [1,101,500,1500]){
 const h=await staged(size);
 const before=h.writes;
 const result=await commitTrustedOfficialClassPublication(h.options());
 assert.equal(result.committed,true);
 assert.equal(result.rosterCount,size);
 assert.equal(result.batchCount,Math.ceil(size/100));
 assert.equal(h.writes,before+4,'Header, pointer, audit and read view must be committed together');
 const pointerId=officialClassPointerId(scope);
 const pointer=h.docs.get(prefix+'official_marks_pointers/'+pointerId);
 const view=h.docs.get(prefix+'official_read_views/'+pointerId);
 assert.equal(view.publicationId,publicationId);assert.equal(view.entries.length,size);assert.equal(view.contentDigest,pointer.contentDigest);
 const publication=h.docs.get(prefix+'official_marks_publications/'+publicationId);
 const audit=h.docs.get(prefix+'official_marks_audit/'+publicationId);
 assert.equal(pointer.publicationId,publicationId);
 assert.equal(publication.state,'committed');
 assert.equal(publication.digest,pointer.digest);
 assert.equal(pointer.settingsDigest,computeOfficialSettingsDigest(h.input.settings,scope));
 assert.equal(publication.settingsDigest,pointer.settingsDigest);
 assert.equal(audit.settingsDigest,pointer.settingsDigest);
 assert.equal(audit.action,'official_class_marks_publish');
 assert.equal(audit.approvedBy,actor.uid);
 const rows=Array.from({length:Math.ceil(size/100)},(_,i)=>
  h.docs.get(prefix+'marks_staging/'+publicationId+'/batches/b'+String(i).padStart(4,'0'))
 ).flatMap(page=>page.entries.map(row=>({...row,publicationId})));
 assert.equal(resolveOfficialClassMarks({...scope,pointer,publication,entries:rows}).rosterCount,size);
 const current=h.writes;
 await assert.rejects(commitTrustedOfficialClassPublication(h.options()),/Concurrent publication/);
 assert.equal(h.writes,current,'Duplicate publication must not overwrite audit or pointer');
}
{
 const h=await staged(101);
 const before=h.writes;
 h.docs.get(prefix+'roster_snapshots/9').revision='r2';
 await assert.rejects(commitTrustedOfficialClassPublication(h.options()),/snapshot|stale|altered/);
 assert.equal(h.writes,before,'Stale roster must not create an official pointer');
}
{
 const h=await staged(101);
 const before=h.writes;
 h.docs.get(prefix+'mark_settings/class9_computer_final').settings.components[0].fullMarks=30;
 await assert.rejects(commitTrustedOfficialClassPublication(h.options()),/verified class|review|settings|Complete|stale|altered/i);
 assert.equal(h.writes,before,'Changed Examination Settings must not publish');
}
{
 const h=await staged(101);
 const before=h.writes;
 const original=h.api.runTransaction;
 const memberPath=prefix+'members/'+actor.uid;
 const tampering={...h.api,runTransaction:async(db,callback)=>{
  h.docs.get(memberPath).active=false;
  return original(db,callback);
 }};
 await assert.rejects(commitTrustedOfficialClassPublication(h.options({api:tampering})),/revoked/);
 assert.equal(h.writes,before,'Revoked School Admin must not publish');
}
{
 const h=await staged(101);
 const before=h.writes,original=h.api.runTransaction;
 const page=prefix+'marks_staging/'+publicationId+'/batches/b0000';
 const tampering={...h.api,runTransaction:async(db,callback)=>{
  h.docs.get(page).entries[0].values.written=35;
  return original(db,callback);
 }};
 await assert.rejects(commitTrustedOfficialClassPublication(h.options({api:tampering})),/altered/);
 assert.equal(h.writes,before,'Changed staged scores must not publish');
}
{
 const h=await staged(101);
 const before=h.writes,original=h.api.runTransaction;
 const ptr=prefix+'official_marks_pointers/'+officialClassPointerId(scope);
 const colliding={...h.api,runTransaction:async(db,callback)=>{
  h.docs.set(ptr,{...scope,publicationId:'pub_conflict01',digest:'a'.repeat(64),rosterCount:101});
  return original(db,callback);
 }};
 await assert.rejects(commitTrustedOfficialClassPublication(h.options({api:colliding})),/Concurrent publication/);
 assert.equal(h.writes,before,'Concurrent pointer must never be overwritten');
}
{
 const h=await staged(101);
 const before=h.writes;
 h.docs.set(prefix+'official_marks_publications/'+publicationId,{state:'committed'});
 await assert.rejects(commitTrustedOfficialClassPublication(h.options()),/already committed/);
 assert.equal(h.writes,before,'Prior publication record must not be overwritten');
}
{
 const h=await staged(101);
 const before=h.writes;
 await assert.rejects(commitTrustedOfficialClassPublication(h.options({
  loadTransactionalAuthoritative:undefined
 })),/Transactional authoritative/);
 await assert.rejects(commitTrustedOfficialClassPublication(h.options({
  schoolId:'67890'
 })),/Active School Admin|Authoritative school|scope/i);
 assert.equal(h.writes,before,'Missing trusted transactional loader and cross-school callers cannot write');
}
{
 // Re-publication must preserve the prior official header and use CAS, never
 // delete/rewrite it while switching one pointer to a reviewed replacement.
 const h=await staged(101);
 await commitTrustedOfficialClassPublication(h.options());
 const old=h.docs.get(prefix+'official_marks_publications/'+publicationId);
 const nextId='pub_00000002';
 await stageTrustedClassMarks(h.options({publicationId:nextId}));
 const change=await commitTrustedOfficialClassPublication(h.options({
  publicationId:nextId,expectedPreviousId:publicationId
 }));
 assert.equal(change.previousPublicationId,publicationId);
 assert.equal(h.docs.get(prefix+'official_marks_publications/'+publicationId).digest,old.digest);
 assert.equal(h.docs.get(prefix+'official_marks_pointers/'+officialClassPointerId(scope)).publicationId,nextId);
 assert.equal(h.docs.get(prefix+'official_read_views/'+officialClassPointerId(scope)).publicationId,nextId);
}
console.log('V47 trusted official publication CAS: 1/101/500/1500 rows; atomic header/pointer/audit, revocation, tampering, stale roster/settings, conflict and cross-school denials');

 
// Exercise the actual atomic trusted publication output through the Spark
// browser report reader, rather than constructing a parallel synthetic view.
{
 const h=harness(101,true);
 await stageTrustedClassMarks(h.options());
 const schoolId=scope.schoolId,klass=scope.classId,term=scope.examId;
 const base='schools/'+schoolId;
 h.docs.set(base,{id:schoolId,active:true,name:'Synthetic School'});
 h.docs.set(base+'/subjects/computer',{schoolId,class:klass,name:'Computer Science',active:true,creditHour:4});
 const settingsId=klass+'_computer_'+term;
 h.docs.set(base+'/mark_settings/'+settingsId,clone({...h.input.settings,id:settingsId}));
 for(const id of h.input.expectedStudentIds)h.docs.set(base+'/students/'+id,{schoolId,class:klass,name:'Student '+id,active:true});
 const snapshot=p=>({id:p.split('/').at(-1),ref:{path:p},exists:()=>h.docs.has(p),data:()=>clone(h.docs.get(p))});
 const reads=[];
 const readApi={
  doc:(_db,...p)=>p.join('/'),collection:(_db,...p)=>p.join('/'),
  where:(...v)=>({kind:'where',v}),orderBy:(...v)=>({kind:'order',v}),
  limit:n=>({kind:'limit',n}),startAfter:id=>({kind:'after',id}),
  query:(path,...conditions)=>({path,conditions}),
  getDocFromServer:async p=>{reads.push(p);return snapshot(p)},
  getDocsFromServer:async({path,conditions})=>{
   const after=conditions.find(x=>x.kind==='after')?.id??'';
   const limit=conditions.find(x=>x.kind==='limit')?.n??101;
   const where=conditions.find(x=>x.kind==='where')?.v;
   return {docs:[...h.docs.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/'))
    .sort().map(snapshot).filter(d=>d.id>after&&(!where||d.data()[where[0]]===where[2])).slice(0,limit)};
  },
  runTransaction:async(_db,fn)=>fn({get:async p=>{reads.push(p);return snapshot(p)},set:()=>{throw Error('Report must not write')}})
 };
 const readActor={...actor};
 const args={db:{},api:readApi,auth:{currentUser:{uid:actor.uid}},actor:readActor,schoolId,classNo:klass,term,assertCurrent:()=>{}};
 await assert.rejects(loadSparkCommittedReport(args),/Missing settings or committed read view/);
 await commitTrustedOfficialClassPublication(h.options());
 const report=await loadSparkCommittedReport(args);
 assert.equal(report.committedViewPreview,true);
 assert.equal(report.publicationAllowed,false);
 assert.equal(report.rosterCount,101);
 assert.equal(report.summary.rows[0].gpa,null);
 assert.equal(report.summary.rows[1].gpa,4);
 assert.match(report.ledgers.grade.body,/>Abs<\/td>/);
 assert.equal(report.printFor(h.input.expectedStudentIds[0]).ready,false);
 const sheet=report.printFor(h.input.expectedStudentIds[1]);
 assert.equal(sheet.ready,true);assert.match(sheet.html,/NOT VALID FOR OFFICIAL USE/);
 for(const mode of ['grade','number','entry']){
  const bytes=new Uint8Array(await legacyGradePreviewExcel(report,mode).arrayBuffer());
  assert.deepEqual([...bytes.slice(0,2)],[80,75]);
  assert.match(new TextDecoder().decode(bytes),/NOT FOR OFFICIAL USE/);
 }
 assert.ok(!reads.some(p=>/\/(marks_staging|class_mark_drafts|official_drafts)\//.test(p)),'Browser must not read private staging or drafts');
 const viewPath=base+'/official_read_views/'+officialClassPointerId(scope);
 const view=clone(h.docs.get(viewPath));
 h.docs.get(viewPath).entries[1].totalObtained-=1;
 await assert.rejects(loadSparkCommittedReport(args),/content digest mismatch/);
 h.docs.set(viewPath,view);
 h.docs.get(base+'/mark_settings/'+settingsId).components[0].fullMarks+=1;
 await assert.rejects(loadSparkCommittedReport(args),/Settings changed/);
 h.docs.set(base+'/mark_settings/'+settingsId,clone({...h.input.settings,id:settingsId}));
 // A verified Viewer can read the committed view but cannot gain write access.
 readActor.role='viewer';h.docs.set(base+'/members/'+actor.uid,{...readActor});
 assert.equal((await loadSparkCommittedReport(args)).rosterCount,101);
 h.docs.get(base+'/members/'+actor.uid).active=false;
 await assert.rejects(loadSparkCommittedReport(args),/Membership unavailable/);
 await assert.rejects(loadSparkCommittedReport({...args,schoolId:'67890'}),/Verified active school membership/);
}
console.log('PASS actual 101-student trusted publication to Spark committed IEMIS report, absence/GPA/XLSX, tamper and membership denials');
