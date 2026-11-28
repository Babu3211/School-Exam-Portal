// E2E for the real Firebase ADMIN SDK against the local Firestore emulator.
// Fail closed unless the CLI launched this exact isolated emulator. No Firebase
// production credentials, hosting, HTTP API, or real student data are used.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {createV47ApiServer} from '../src/v47/node-api-server.mjs';
import {runSavedClassPublication} from './saved-class-publication-client.mjs';
// Admin SDK intentionally lives in the isolated v47-runtime package, not V46.
const requireV47=createRequire(new URL('../v47-runtime/package.json',import.meta.url));
 import {createAdminClassPublicationReaders} from './server-publication-authoritative-loader.mjs';
import {stageTrustedClassMarks} from './server-publication-staging-executor.mjs';
import {commitTrustedOfficialClassPublication} from './server-official-publication-commit.mjs';
import {fingerprintConfiguredClassReview} from './server-class-review-fingerprint.mjs';
import {officialClassPointerId} from './server-publication-authoritative-preflight.mjs';
import {reviewOrSaveAtomicClassAttendance} from './server-atomic-class-attendance.mjs';
import {createV47NodeAtomicAttendanceHandler} from '../src/v47/node-atomic-attendance-handler.mjs';
import {loadCommittedOfficialClassMarks} from './server-official-marks-firestore-loader.mjs';
import {createV47PublicationReviewHttpHandler} from '../src/v47/publication-review-http-handler.mjs';
import {createV47NodePublicationStageHandler} from '../src/v47/node-publication-stage-handler.mjs';
import {createV47NodePublicationCommitHandler} from '../src/v47/node-publication-commit-handler.mjs';
const allowedHosts=['127.0.0.1:8081','localhost:8081','[::1]:8081'];
const localEmulator=allowedHosts.includes(process.env.FIRESTORE_EMULATOR_HOST);
if(!localEmulator){
 if(process.env.V47_REQUIRE_PUBLICATION_EMULATOR==='true')
  throw Error('Required local Firestore emulator unavailable; refusing to skip security E2E');
 console.log('SKIP publication Admin SDK emulator E2E in ordinary unit runner (dedicated emulator job REQUIRED)');
}else{
const {initializeApp,deleteApp}=requireV47('firebase-admin/app');
const {getFirestore}=requireV47('firebase-admin/firestore');
const app=initializeApp({projectId:'smss-v47-marks-local-ci'},'v47-marks-local-ci');
const db=getFirestore(app);
const schoolId='12345678',classId='9',subjectId='computer',examId='final',actorUid='admin1';
const scope={schoolId,classId,subjectId,examId};
const root='schools/'+schoolId,identifier=classId+'_'+subjectId+'_'+examId;
const path=(...parts)=>root+'/'+parts.join('/');
const put=async(ref,value)=>db.doc(ref).set(value);
const count=101;
try{
 const marks=[],batch=db.batch();
 batch.set(db.doc(root),{id:schoolId,name:'Emulator School',active:true,iemisCode:schoolId});
 batch.set(db.doc(path('members',actorUid)),{uid:actorUid,role:'school_admin',schoolId,active:true});
 batch.set(db.doc(path('subjects',subjectId)),{schoolId,class:classId,name:'Computer',active:true});
 batch.set(db.doc(path('mark_settings',identifier)),{
  id:identifier,...scope,active:true,components:[
   {key:'internal',name:'Internal',fullMarks:4},
   {key:'written',name:'Written',fullMarks:36},
   {key:'practical',name:'Practical',fullMarks:10}
  ]
 });
 for(let i=0;i<count;i++){
  const studentId='s'+String(i).padStart(4,'0');
  batch.set(db.doc(path('students',studentId)),{
   schoolId,class:classId,active:true,name:'Synthetic Student '+i
  });
  marks.push({studentId,isAbsent:false,values:{internal:4,written:35,practical:9},totalObtained:48});
 }
 batch.set(db.doc(path('class_mark_drafts',identifier)),{
  format:'smss-v47-complete-class-draft-v1',state:'draft',...scope,
  settingsId:identifier,rosterCount:count,revision:1,
  updatedBy:actorUid,updatedAt:'synthetic-emulator-test',entries:marks
 });
 await batch.commit();
 const reader=createAdminClassPublicationReaders({firestore:db,...scope,actorUid});
 const authoritative=await reader.loadAuthoritative({schoolId,uid:actorUid});
 assert.equal(authoritative.expectedStudentIds.length,count);
 assert.equal(authoritative.settings.components[0].fullMarks,4);
 assert.equal(authoritative.settings.components[1].fullMarks,36);
 assert.equal(authoritative.settings.components[2].fullMarks,10);
 const review=fingerprintConfiguredClassReview(authoritative);
 // Actual Admin SDK read-only review endpoint, no approval or writes.
 const publicationReview=createV47PublicationReviewHttpHandler({
  auth:{verifyIdToken:async(token,revoked)=>{
   assert.equal(revoked,true);
   if(token==='revoked')throw Error('Revoked');
   return {uid:token,firebase:{sign_in_provider:'password'}};
  }},
  firestore:db
 });
 const approvedReview=await publicationReview({method:'GET',headers:{authorization:'Bearer '+actorUid},query:scope});
 assert.equal(approvedReview.status,200);
 assert.equal(approvedReview.body.review.digest,review.digest);
 assert.equal(approvedReview.body.publishAuthorized,false);
 assert.equal((await publicationReview({method:'GET',headers:{authorization:'Bearer viewer1'},query:scope})).status,403);

 const confirmation=Object.fromEntries(
  ['format','schoolId','classId','subjectId','examId','settingsRevision','rosterRevision','digestAlgorithm','digest'].map(k=>[k,review[k]])
 );
 // Exercise the real Admin SDK staging endpoint (not only its pure executor).
 // It must stage 101 rows with an unpredictable ID, but never publish.
 const stageHandler=createV47NodePublicationStageHandler({
  auth:{verifyIdToken:async(token,revoked)=>{
   assert.equal(revoked,true);
   return {uid:token,firebase:{sign_in_provider:'password'}};
  }},firestore:db
 });
 const stageRequest={
  url:'/api/v47/publication/stage',method:'POST',
  headers:{authorization:'Bearer '+actorUid,'content-type':'application/json'},
  async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify({scope,confirmation,confirmStage:true}));}
 };
 const stageReply={writableEnded:false,headersSent:false,setHeader(){},
  end(value){this.body=JSON.parse(value);this.writableEnded=true;}};
 await stageHandler(stageRequest,stageReply);
 assert.equal(stageReply.statusCode,202);
 assert.equal(stageReply.body.stage.rosterCount,count);
 assert.equal(stageReply.body.stage.publicationAllowed,false);
 const stageHttpId=stageReply.body.stage.publicationId;
 assert.equal((await db.doc(path('marks_staging',stageHttpId)).get()).exists,true);
 assert.equal((await db.doc(path('official_marks_pointers',officialClassPointerId(scope))).get()).exists,false);

 const publicationId='pub_00000001';
 const options={...reader,confirmation,publicationId};
 const stage=await stageTrustedClassMarks(options);
 assert.equal(stage.rosterCount,count);
 assert.equal(stage.batchCount,2);
 assert.equal(stage.publicationAllowed,false);
 const pointerId=officialClassPointerId(scope);
 const pointerRef=db.doc(path('official_marks_pointers',pointerId));
 assert.equal((await pointerRef.get()).exists,false,'A completed stage is not official');
 const unpublished=await loadCommittedOfficialClassMarks({firestore:db,...scope,actorUid});
 assert.equal(unpublished.published,false,'Staged marks are never official before pointer commit');
 // Test invalid admin and data changes BEFORE the actual commit.
 const memberRef=db.doc(path('members',actorUid));
 await memberRef.update({active:false});
 await assert.rejects(commitTrustedOfficialClassPublication(options),/School Admin/);
 assert.equal((await pointerRef.get()).exists,false);
 await memberRef.update({active:true});
 const studentRef=db.doc(path('students','s0000'));
 await studentRef.update({active:false});
 await assert.rejects(commitTrustedOfficialClassPublication(options),/inactive|student|roster/i);
 assert.equal((await pointerRef.get()).exists,false);
 await studentRef.update({active:true});
 const completed=await commitTrustedOfficialClassPublication(options);
 assert.equal(completed.committed,true);
 assert.equal(completed.rosterCount,count);
 assert.equal(completed.batchCount,2);
 const [pointerSnap,headerSnap,auditSnap]=await Promise.all([
  pointerRef.get(),
  db.doc(path('official_marks_publications',publicationId)).get(),
  db.doc(path('official_marks_audit',publicationId)).get()
 ]);
 assert.equal(pointerSnap.data().publicationId,publicationId);
 assert.equal(pointerSnap.data().digest,headerSnap.data().digest);
 assert.equal(headerSnap.data().state,'committed');
 assert.equal(auditSnap.data().action,'official_class_marks_publish');
 assert.equal(auditSnap.data().approvedBy,actorUid);
 const official=await loadCommittedOfficialClassMarks({firestore:db,...scope,actorUid});
 assert.equal(official.published,true);
 assert.equal(official.entries.length,count);
 assert.deepEqual(official.entries[0].values,{internal:4,written:35,practical:9});
 // An active Viewer may read the committed result but never unpublished staging.
 await put(path('members','viewer1'),{uid:'viewer1',role:'viewer',schoolId,active:true});
 assert.equal((await loadCommittedOfficialClassMarks({firestore:db,...scope,actorUid:'viewer1'})).rosterCount,count);
 await db.doc(path('members','viewer1')).update({active:false});
 await assert.rejects(loadCommittedOfficialClassMarks({firestore:db,...scope,actorUid:'viewer1'}),/membership/);
 // A missing page must fail closed even when a pointer and header exist.
 const secondPage=db.doc(path('marks_staging',publicationId,'batches','b0001'));
 const savedPage=(await secondPage.get()).data();
 await secondPage.delete();
 await assert.rejects(loadCommittedOfficialClassMarks({firestore:db,...scope,actorUid}),/staging page/);
 await secondPage.set(savedPage);
 const validLookingTamper=structuredClone(savedPage);
 validLookingTamper.entries[0].values.internal=3;
 validLookingTamper.entries[0].totalObtained=47;
 await secondPage.set(validLookingTamper);
 await assert.rejects(loadCommittedOfficialClassMarks({firestore:db,...scope,actorUid}),/content digest mismatch/);
 await secondPage.set(savedPage);
 // A valid publication must stop serving results if live student/settings
 // records no longer match the complete approved class.
 const settingsRef=db.doc(path('mark_settings',identifier));
 const savedSettings=(await settingsRef.get()).data();
 await settingsRef.update({components:[{...savedSettings.components[0],fullMarks:3},...savedSettings.components.slice(1)]});
 await assert.rejects(loadCommittedOfficialClassMarks({firestore:db,...scope,actorUid}),/exceeds Examination Settings/);
 await settingsRef.update({components:savedSettings.components});
 await studentRef.update({active:false});
 await assert.rejects(loadCommittedOfficialClassMarks({firestore:db,...scope,actorUid}),/Inactive|roster/);
 await studentRef.update({active:true});
 // No legacy marks or per-student official rows are accidentally overwritten.
 assert.equal((await db.collection(path('marks')).get()).size,0);
 await assert.rejects(commitTrustedOfficialClassPublication(options),/Concurrent publication/);
 const pointerAfter=await pointerRef.get();
 assert.equal(pointerAfter.data().publicationId,publicationId);
 // A second tenant's existing membership never grants access to this scope.
 await assert.rejects(reader.loadAuthoritative({schoolId:'87654321',uid:actorUid}),/Cross-school/);
 // Default final-commit API is disabled, even with real Admin SDK and token.
 const publishAuth={verifyIdToken:async(token,checkRevoked)=>{
  assert.equal(checkRevoked,true);
  return {uid:token,firebase:{sign_in_provider:'password'}};
 }};
 const publishInput={scope,confirmation,publicationId:stageHttpId,
  expectedPreviousId:publicationId,confirmPublish:'PUBLISH OFFICIAL MARKS'};
 const requestPublish=()=>{
  return {url:'/api/v47/publication/commit',method:'POST',
   headers:{authorization:'Bearer '+actorUid,'content-type':'application/json'},
   async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(publishInput));}};
 };
 const getResponse=()=>({writableEnded:false,headersSent:false,setHeader(){},
  end(value){this.body=JSON.parse(value);this.writableEnded=true;}});
 const disabledCommit=createV47NodePublicationCommitHandler({auth:publishAuth,firestore:db});
 const disabledRes=getResponse();
 await disabledCommit(requestPublish(),disabledRes);
 assert.equal(disabledRes.statusCode,503);
 assert.equal((await pointerRef.get()).data().publicationId,publicationId);
 // Explicitly enable ONLY this isolated test handler, never V47 production.
 const approvedCommit=createV47NodePublicationCommitHandler({
  auth:publishAuth,firestore:db,publicationEnabled:true
 });
 const committedRes=getResponse();
 await approvedCommit(requestPublish(),committedRes);
 assert.equal(committedRes.statusCode,200);
 assert.equal(committedRes.body.result.committed,true);
 assert.equal((await pointerRef.get()).data().publicationId,stageHttpId);
 assert.equal((await db.doc(path('official_marks_publications',stageHttpId)).get()).data().state,'committed');
 assert.equal((await loadCommittedOfficialClassMarks({firestore:db,...scope,actorUid})).entries.length,101);
 const duplicateCommit=getResponse();
 await approvedCommit(requestPublish(),duplicateCommit);
 assert.equal(duplicateCommit.statusCode,403,'CAS and reuse must refuse duplicate HTTP commit');
 // Browser client over actual loopback HTTP router + real Admin SDK emulator.
 // Only the test server may enable final publication.
 const runHttpClient=async (enabled,callback)=>{
  const http=createV47ApiServer({auth:publishAuth,firestore:db,publicationEnabled:enabled});
  http.listen(0,'127.0.0.1');await once(http,'listening');
  const url='http://127.0.0.1:'+http.address().port;
  const requests=[];
  const fetchImpl=async(path,opts)=>{requests.push(path);return fetch(url+path,opts)};
  try{return await callback({scope,getIdToken:async()=>actorUid,fetchImpl,assertCurrent:()=>{},confirmStage:()=>true,confirmCommit:()=>true},requests)}
  finally{http.closeAllConnections?.();await new Promise(resolve=>http.close(resolve))}
 };
 await runHttpClient(false,async(opts,requests)=>{
  const before=(await db.collection(path('marks_staging')).get()).size;
  const reviewed=await runSavedClassPublication({...opts,confirmStage:()=>assert.fail('Disabled runtime must not prompt for staging'),confirmCommit:()=>assert.fail('Disabled runtime must not prompt for final commit')});
  assert.deepEqual(reviewed,{committed:false,reviewOnly:true,rosterCount:count});
  assert.deepEqual(requests,['/api/v47/runtime-status','/api/v47/publication-review?'+new URLSearchParams(scope)]);assert.equal((await pointerRef.get()).data().publicationId,stageHttpId);
  assert.equal((await db.collection(path('marks_staging')).get()).size,before,'Disabled final publication must not create orphan staged manifests');
 });
 let latestPublication;
 await runHttpClient(true,async(opts,requests)=>{
  const cancelled=await runSavedClassPublication({...opts,confirmStage:()=>false});
  assert.equal(cancelled.committed,false);assert.deepEqual(requests,['/api/v47/runtime-status','/api/v47/publication-review?'+new URLSearchParams(scope)]);
  const published=await runSavedClassPublication({...opts,confirmCommit:info=>{
   assert.equal(info.previousPublicationId,stageHttpId);assert.equal(info.review.rosterCount,count);return true
  }});
  assert.equal(published.committed,true);latestPublication=published.publicationId;
  assert.deepEqual(requests.slice(2),['/api/v47/runtime-status','/api/v47/publication-review?'+new URLSearchParams(scope),'/api/v47/publication/stage','/api/v47/publication/commit']);assert.equal((await pointerRef.get()).data().publicationId,latestPublication);
  assert.equal((await loadCommittedOfficialClassMarks({firestore:db,...scope,actorUid})).rosterCount,count);
  await assert.rejects(runSavedClassPublication({...opts,getIdToken:async()=>'viewer1',confirmStage:()=>assert.fail('Viewer must not reach staging')}),/403/);
  assert.deepEqual(requests.slice(6),['/api/v47/runtime-status','/api/v47/publication-review?'+new URLSearchParams(scope)]);
  assert.equal((await pointerRef.get()).data().publicationId,latestPublication);
 });
 console.log('PASS actual HTTP browser publication client: review/stage/commit, disabled default, CAS pointer, cancellation and denied Viewer');
 // Verify atomic attendance against actual Admin SDK transactions, not just mocks.
 const date='2026-11-24',attendanceScope={firestore:db,schoolId,classId,date,actorUid};
 const attendanceEntries=marks.map(({studentId})=>({studentId,class:classId,date,present:true}));
 const attendance=()=>db.collection(path('attendance')).where('date','==',date).where('class','==',classId).get();
 const reviewAttendance=await reviewOrSaveAtomicClassAttendance({...attendanceScope,entries:attendanceEntries});
 assert.equal(reviewAttendance.committed,false);
 assert.equal((await attendance()).size,0);
 await memberRef.update({active:false});
 await assert.rejects(reviewOrSaveAtomicClassAttendance({...attendanceScope,entries:attendanceEntries,reviewDigest:reviewAttendance.reviewDigest}),/Active School Admin/);
 assert.equal((await attendance()).size,0);
 await memberRef.update({active:true});
 // A new student invalidates an otherwise legitimate review. No partial writes.
 const newStudent=db.doc(path('students','attendance_new'));
 await newStudent.set({schoolId,class:classId,active:true});
 await assert.rejects(reviewOrSaveAtomicClassAttendance({...attendanceScope,entries:attendanceEntries,reviewDigest:reviewAttendance.reviewDigest}),/incomplete/i);
 assert.equal((await attendance()).size,0);
 await newStudent.delete();
 const atomicResult=await reviewOrSaveAtomicClassAttendance({...attendanceScope,entries:attendanceEntries,reviewDigest:reviewAttendance.reviewDigest});
 assert.equal(atomicResult.committed,true);
 assert.equal(atomicResult.count,count);
 assert.equal((await attendance()).size,count);
 const correction=attendanceEntries.map((e,i)=>({...e,present:i%2===0}));
 const correctedReview=await reviewOrSaveAtomicClassAttendance({...attendanceScope,entries:correction});
 // Simulate a competing single-student correction after the class review.
 const firstAttendance=db.doc(path('attendance',date+'_s0000'));
 await firstAttendance.update({present:false});
 await assert.rejects(reviewOrSaveAtomicClassAttendance({...attendanceScope,entries:correction,reviewDigest:correctedReview.reviewDigest}),/changed after review/);
 assert.equal((await db.doc(path('attendance',date+'_s0001')).get()).data().present,true);
 const refreshed=await reviewOrSaveAtomicClassAttendance({...attendanceScope,entries:correction});
 const attendanceRequest=(reviewDigest)=>({url:'/api/v47/attendance/atomic',method:'POST',
  headers:{authorization:'Bearer '+actorUid,'content-type':'application/json'},
  async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify({schoolId,classId,date,entries:correction,reviewDigest}))}});
 const disabledAttendance=createV47NodeAtomicAttendanceHandler({auth:publishAuth,firestore:db});
 const disabledAttendanceResponse=getResponse();
 await disabledAttendance(attendanceRequest(refreshed.reviewDigest),disabledAttendanceResponse);
 assert.equal(disabledAttendanceResponse.statusCode,503);
 const approvedAttendance=createV47NodeAtomicAttendanceHandler({auth:publishAuth,firestore:db,atomicAttendanceEnabled:true});
 const correctedResponse=getResponse();
 await approvedAttendance(attendanceRequest(refreshed.reviewDigest),correctedResponse);
 assert.equal(correctedResponse.statusCode,200);
 assert.equal(correctedResponse.body.result.atomic,true);
 assert.equal(correctedResponse.body.result.committed,true);
 assert.equal((await attendance()).docs.filter(d=>d.data().present===false).length,50);
 // Exercise the actual maximum of 500 changed attendance documents in one commit.
 const largeClass='8',largeDate='2026-11-25';
 const largeRoster=Array.from({length:500},(_,i)=>({studentId:'large'+String(i).padStart(4,'0'),class:largeClass,date:largeDate,present:i%2===0}));
 const largeBatch=db.batch();
 for(const row of largeRoster)largeBatch.set(db.doc(path('students',row.studentId)),{schoolId,class:largeClass,active:true});
 await largeBatch.commit();
 const largeScope={...attendanceScope,classId:largeClass,date:largeDate,entries:largeRoster};
 const largeReview=await reviewOrSaveAtomicClassAttendance(largeScope);
 assert.equal(largeReview.changed,500);
 const largeResult=await reviewOrSaveAtomicClassAttendance({...largeScope,reviewDigest:largeReview.reviewDigest});
 assert.equal(largeResult.committed,true);
 assert.equal(largeResult.changed,500);
 const largeAttendance=await db.collection(path('attendance')).where('date','==',largeDate).where('class','==',largeClass).get();
 assert.equal(largeAttendance.size,500);
 assert.equal(largeAttendance.docs.filter(d=>d.data().present).length,250);
 console.log('PASS real Firestore atomic attendance: 101 and 500 students, stale roster and competing edits rejected, disabled API and one-transaction commit');
 // Additional upper-bound marks publication test; do not extend the attendance
 // test (its independent atomic limit is 500). All fixtures are emulator-only.
 const maxScope={schoolId,classId:'10',subjectId:'computer10',examId:'final'};
 const maxKey='10_computer10_final',maxCount=1500,maxEntries=[];
 await put(path('subjects',maxScope.subjectId),{schoolId,class:'10',name:'Computer',active:true});
 await put(path('mark_settings',maxKey),{id:maxKey,...maxScope,active:true,components:[
  {key:'internal',name:'Internal',fullMarks:4},{key:'written',name:'Written',fullMarks:36},{key:'practical',name:'Practical',fullMarks:10}
 ]});
 for(let start=0;start<maxCount;start+=400){
  const seed=db.batch();
  for(let i=start;i<Math.min(start+400,maxCount);i++){
   const studentId='max'+String(i).padStart(4,'0'),isAbsent=i%100===0;
   seed.set(db.doc(path('students',studentId)),{schoolId,class:'10',active:true,name:'Synthetic Max Student '+i});
   maxEntries.push({studentId,isAbsent,values:isAbsent?null:{internal:4,written:i%37,practical:10},totalObtained:isAbsent?0:14+i%37});
  }
  await seed.commit();
 }
 await put(path('class_mark_drafts',maxKey),{format:'smss-v47-complete-class-draft-v1',state:'draft',...maxScope,settingsId:maxKey,rosterCount:maxCount,revision:1,updatedBy:actorUid,updatedAt:'synthetic-max-emulator-test',entries:maxEntries});
 const maxReader=createAdminClassPublicationReaders({firestore:db,...maxScope,actorUid});
 const maxInput=await maxReader.loadAuthoritative({schoolId,uid:actorUid});
 assert.equal(maxInput.expectedStudentIds.length,maxCount);
 const maxReview=fingerprintConfiguredClassReview(maxInput);
 const maxConfirmation=Object.fromEntries(['format','schoolId','classId','subjectId','examId','settingsRevision','rosterRevision','digestAlgorithm','digest'].map(k=>[k,maxReview[k]]));
 const maxOptions={...maxReader,confirmation:maxConfirmation,publicationId:'pub_max_1500'};
 const maxStage=await stageTrustedClassMarks(maxOptions);
 assert.equal(maxStage.rosterCount,maxCount);assert.equal(maxStage.batchCount,15);
 const maxPointer=db.doc(path('official_marks_pointers',officialClassPointerId(maxScope)));
 assert.equal((await maxPointer.get()).exists,false);
 const maxCommit=await commitTrustedOfficialClassPublication(maxOptions);
 assert.equal(maxCommit.committed,true);assert.equal(maxCommit.rosterCount,maxCount);
 const maxOfficial=await loadCommittedOfficialClassMarks({firestore:db,...maxScope,actorUid});
 assert.equal(maxOfficial.published,true);assert.equal(maxOfficial.entries.length,maxCount);
 assert.equal(maxOfficial.entries.filter(e=>e.isAbsent).length,15);
 assert.equal(maxOfficial.entries[1499].values.written,1499%37);
 const maxView=(await db.doc(path('official_read_views',officialClassPointerId(maxScope))).get()).data();
 assert.equal(maxView.entries.length,maxCount);
 assert.equal(maxView.contentDigest,(await maxPointer.get()).data().contentDigest);
 assert.equal((await db.collection(path('marks')).get()).size,0);
 console.log('PASS 1500-student configured 4/36/10 publication: 15 pages, absent entries, atomic pointer/read view and full committed reader');
 console.log('PASS real Firebase Admin Firestore emulator: 101-student configured 4/36/10 staging, two pages, transaction-scoped full roster, CAS pointer/header/audit, official 101-row reader, active Viewer, revoked membership, missing page and inactive-student refusals');
}finally{
 await deleteApp(app);
}
}
