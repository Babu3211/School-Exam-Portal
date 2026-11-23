// E2E for the real Firebase ADMIN SDK against the local Firestore emulator.
// Fail closed unless the CLI launched this exact isolated emulator. No Firebase
// production credentials, hosting, HTTP API, or real student data are used.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
// Admin SDK intentionally lives in the isolated v47-runtime package, not V46.
const requireV47=createRequire(new URL('../v47-runtime/package.json',import.meta.url));
 import {createAdminClassPublicationReaders} from './server-publication-authoritative-loader.mjs';
import {stageTrustedClassMarks} from './server-publication-staging-executor.mjs';
import {commitTrustedOfficialClassPublication} from './server-official-publication-commit.mjs';
import {fingerprintConfiguredClassReview} from './server-class-review-fingerprint.mjs';
import {officialClassPointerId} from './server-publication-authoritative-preflight.mjs';
import {loadCommittedOfficialClassMarks} from './server-official-marks-firestore-loader.mjs';
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
 const confirmation=Object.fromEntries(
  ['format','schoolId','classId','subjectId','examId','settingsRevision','rosterRevision','digestAlgorithm','digest'].map(k=>[k,review[k]])
 );
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
 // No legacy marks or per-student official rows are accidentally overwritten.
 assert.equal((await db.collection(path('marks')).get()).size,0);
 await assert.rejects(commitTrustedOfficialClassPublication(options),/Concurrent publication/);
 const pointerAfter=await pointerRef.get();
 assert.equal(pointerAfter.data().publicationId,publicationId);
 // A second tenant's existing membership never grants access to this scope.
 await assert.rejects(reader.loadAuthoritative({schoolId:'87654321',uid:actorUid}),/Cross-school/);
 console.log('PASS real Firebase Admin Firestore emulator: 101-student configured 4/36/10 staging, two pages, transaction-scoped full roster, CAS pointer/header/audit, official 101-row reader, active Viewer, revoked membership, missing page and inactive-student refusals');
}finally{
 await deleteApp(app);
}
}
