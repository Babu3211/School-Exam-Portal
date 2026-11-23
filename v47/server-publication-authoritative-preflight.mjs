// Trusted-server integration: read ACTUAL persisted staged rows + live tenant
// records and verify a publication proposal. Nothing here can publish results.
// It must not be included in the browser hosting bundle.
import {createHash} from 'node:crypto';
import {fingerprintConfiguredClassReview} from './server-class-review-fingerprint.mjs';
import {verifyPublicationTransition} from './server-publication-transition-preflight.mjs';
const schoolPattern=/^[0-9]{5,20}$/;
const segment=/^[A-Za-z0-9_-]{1,128}$/;
const publicationPattern=/^[A-Za-z0-9_-]{8,128}$/;
const snapExists=s=>typeof s?.exists==='function'?s.exists():s?.exists===true;
const dataOf=s=>snapExists(s)?s.data():null;

export function officialClassPointerId({classId,subjectId,examId}){
 if(![classId,subjectId,examId].every(x=>typeof x==='string'&&segment.test(x)))
  throw Error('Verified class, subject and exam scope required');
 return createHash('sha256').update(JSON.stringify([classId,subjectId,examId])).digest('hex');
}

// All I/O below uses a trusted server adapter. Browser-submitted drafts,
// staged pages, membership, and pointers are NEVER accepted as authority.
export async function loadTrustedPublicationPreflight({
 db,api,schoolId,classId,subjectId,examId,publicationId,actorUid,
 confirmation,expectedPreviousId=null,verifyAdmin,loadAuthoritative
}){
 if(typeof schoolId!=='string'||!schoolPattern.test(schoolId)||typeof publicationId!=='string'||!publicationPattern.test(publicationId)||
    typeof actorUid!=='string'||!segment.test(actorUid))throw Error('Valid publication school, ID and admin identity required');
 const pointerId=officialClassPointerId({classId,subjectId,examId});
 if(typeof verifyAdmin!=='function'||typeof loadAuthoritative!=='function')throw TypeError('Trusted server membership and class snapshot callbacks required');
 if(typeof api?.doc!=='function'||typeof api?.getDoc!=='function')throw TypeError('Trusted Firestore reader required');
 const ref=(...parts)=>api.doc(db,'schools',schoolId,...parts);
 const authorized=async()=>{
  const member=await verifyAdmin({schoolId,uid:actorUid});
  if(member?.uid!==actorUid||member?.schoolId!==schoolId||
     member?.role!=='school_admin'||member?.active!==true||member?.schoolActive!==true)
   throw Error('Active School Admin required to review publication');
 };
 const currentInput=async()=>{
  await authorized();
  const input=await loadAuthoritative({schoolId,uid:actorUid});
  if(!input||input.schoolId!==schoolId||input.classId!==classId||
    input.subjectId!==subjectId||input.examId!==examId||
    input.actor?.uid!==actorUid||input.actor?.schoolId!==schoolId||
    input.actor?.role!=='school_admin'||input.actor?.active!==true)
   throw Error('Authoritative school, exam or admin changed');
  const review=fingerprintConfiguredClassReview(input);
  await authorized();
  return {input,review};
 };
 const before=await currentInput();
 const manifest=dataOf(await api.getDoc(ref('marks_staging',publicationId)));
 if(!manifest||manifest.format!=='smss-v47-verified-staging-manifest-v1'||
    manifest.state!=='staged_verified_not_published'||
    manifest.schoolId!==schoolId||manifest.publicationId!==publicationId||
    manifest.classId!==classId||manifest.subjectId!==subjectId||manifest.examId!==examId||
    manifest.verifiedBy!==actorUid||
    manifest.settingsRevision!==before.review.settingsRevision||
    manifest.rosterRevision!==before.review.rosterRevision||
    manifest.digest!==before.review.digest||
    manifest.rosterCount!==before.review.rosterCount||
    !Number.isSafeInteger(manifest.batchCount)||manifest.batchCount!==Math.ceil(manifest.rosterCount/100)||
    manifest.writeAuthorized!==false||manifest.publicationAllowed!==false||
    Object.keys(manifest).sort().join(',')!==[
      'format','state','schoolId','publicationId','classId','subjectId','examId',
      'settingsRevision','rosterRevision','digest','rosterCount','batchCount',
      'verifiedBy','writeAuthorized','publicationAllowed'
    ].sort().join(','))
  throw Error('Verified staging manifest missing, stale or cross-school');
 const stagedBatches=[];
 for(let i=0;i<manifest.batchCount;i++){
  const page=dataOf(await api.getDoc(ref('marks_staging',publicationId,'batches','b'+String(i).padStart(4,'0'))));
  if(!page||page.format!=='smss-v47-staged-page-v1'||page.schoolId!==schoolId||
     page.publicationId!==publicationId||page.classId!==classId||
     page.subjectId!==subjectId||page.examId!==examId||page.digest!==manifest.digest||
     Object.keys(page).sort().join(',')!==[
      'format','schoolId','publicationId','classId','subjectId','examId','digest',
      'index','count','firstStudentId','lastStudentId','entries'
     ].sort().join(','))
   throw Error('Stored staged page is missing or mismatched: '+i);
  stagedBatches.push({
   index:page.index,count:page.count,firstStudentId:page.firstStudentId,
   lastStudentId:page.lastStudentId,entries:page.entries
  });
 }
 const pointerPath=['official_marks_pointers',pointerId];
 const currentPointer=dataOf(await api.getDoc(ref(...pointerPath)));
 const checked=verifyPublicationTransition({
  authoritativeInput:before.input,stagedBatches,confirmation,currentPointer,
  expectedPreviousId,publicationId,actorUid
 });
 const after=await currentInput();
 if(after.review.digest!==before.review.digest)
  throw Error('Authoritative roster, settings or marks changed during publication review');
 await authorized();
 return Object.freeze({...checked,pointerId,pointerPath:Object.freeze([...pointerPath]),
  writeAuthorized:false,publicationAllowed:false,
  warning:'PRE-FLIGHT ONLY: a separate auditable atomic Firestore transaction and explicit release approval are still required.'});
}
