import {sameMarkJson} from './mark-json-equality.mjs';
// Trusted Node/server-only STAGING executor. Not a browser module, public API,
// Firebase Function, or permission to publish. No existing marks are modified.
// A Spark-plan operator must supply a trusted Firestore Admin adapter and
// freshly server-read school membership, roster, settings and draft callbacks.
import {planConfiguredPublicationStaging} from './configured-publication-staging-plan.mjs';
import {fingerprintConfiguredClassReview} from './server-class-review-fingerprint.mjs';
import {verifyCompleteStagedClass} from './server-staged-class-integrity.mjs';

const validId=/^[A-Za-z0-9_-]{8,128}$/;
const validSchool=/^[0-9]{5,20}$/;
const snapExists=snapshot=>typeof snapshot?.exists==='function'?snapshot.exists():snapshot?.exists===true;
const dataOf=snapshot=>snapExists(snapshot)?snapshot.data():null;

export async function stageTrustedClassMarks({
 db,api,schoolId,publicationId,actorUid,verifyAdmin,loadAuthoritative,onProgress=()=>{}
}){
 if(typeof schoolId!=='string'||!validSchool.test(schoolId))throw Error('Numeric IEMIS school ID required');
 if(typeof publicationId!=='string'||!validId.test(publicationId))throw Error('Server-owned publication ID required');
 if(typeof actorUid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(actorUid))throw Error('Verified admin UID required');
 if(typeof verifyAdmin!=='function'||typeof loadAuthoritative!=='function'||typeof onProgress!=='function')
  throw TypeError('Trusted server membership and authoritative snapshot callbacks required');
 for(const method of ['doc','getDoc','runTransaction'])if(typeof api?.[method]!=='function')
  throw TypeError('Trusted Firestore adapter missing '+method);
 const requireAdmin=async()=>{
  // These fields must come from a SERVER-READ active school and membership,
  // never an actor object submitted by a browser.
  const member=await verifyAdmin({schoolId,uid:actorUid});
  if(member?.uid!==actorUid||member?.schoolId!==schoolId||
   member?.role!=='school_admin'||member?.active!==true||member?.schoolActive!==true)
   throw Error('Active School Admin membership required for staging');
 };
 const verifiedInput=async()=>{
  await requireAdmin();
  const input=await loadAuthoritative({schoolId,uid:actorUid});
  if(!input||input.schoolId!==schoolId||input.actor?.uid!==actorUid||
   input.actor?.schoolId!==schoolId||input.actor?.role!=='school_admin'||input.actor?.active!==true)
   throw Error('Authoritative class snapshot differs from verified School Admin');
  const review=fingerprintConfiguredClassReview(input);
  await requireAdmin();
  return {input,review};
 };
 const before=await verifiedInput();
 const plan=planConfiguredPublicationStaging(before.input);
 if(plan.schoolId!==schoolId||plan.rosterCount!==before.review.rosterCount)throw Error('Staging review scope mismatch');
 const path=index=>api.doc(db,'schools',schoolId,'marks_staging',publicationId,'batches','b'+String(index).padStart(4,'0'));
 let completed=0,reused=0;
 for(const page of plan.batches){
  await requireAdmin();
  const expected={
   format:'smss-v47-staged-page-v1',schoolId,publicationId,
   classId:plan.classId,subjectId:plan.subjectId,examId:plan.examId,
   digest:before.review.digest,index:page.index,count:page.count,
   firstStudentId:page.firstStudentId,lastStudentId:page.lastStudentId,
   entries:page.entries.map(row=>({...row,values:row.values===null?null:{...row.values}}))
  };
  const outcome=await api.runTransaction(db,async tx=>{
   if(typeof tx?.get!=='function'||typeof tx?.set!=='function')throw TypeError('Trusted Firestore transaction required');
   const ref=path(page.index),snap=await tx.get(ref);
   if(snapExists(snap)){
    if(!sameMarkJson(dataOf(snap),expected))
     throw Error('Staged publication ID already contains a different page: '+page.index);
    return 'reused';
   }
   tx.set(ref,expected);
   return 'written';
  });
  if(outcome!=='written'&&outcome!=='reused')throw Error('Unknown staging transaction outcome');
  completed+=page.count;
  if(outcome==='reused')reused++;
  try{onProgress({staged:completed,total:plan.rosterCount,existingPages:reused});}
  catch{/* A failed UI/log callback must not misrepresent a committed stage. */}
 }
 // Staged pages can outlive an interrupted attempt. Re-read ALL persisted
 // pages and recheck live roster/settings/admin before marking staging complete.
 const {input:fresh,review:latest}=await verifiedInput();
 if(latest.digest!==before.review.digest)throw Error('Authoritative class changed during staging; no publication permitted');
 const pages=[];
 for(const batch of plan.batches){
  const doc=dataOf(await api.getDoc(path(batch.index)));
  if(!doc||doc.format!=='smss-v47-staged-page-v1'||
   doc.schoolId!==schoolId||doc.publicationId!==publicationId||
   doc.classId!==plan.classId||doc.subjectId!==plan.subjectId||doc.examId!==plan.examId||
   doc.digest!==before.review.digest)throw Error('Committed staged page missing or scope changed');
  const keys=Object.keys(doc).sort().join(',');
  if(keys!==['format','schoolId','publicationId','classId','subjectId','examId','digest','index','count','firstStudentId','lastStudentId','entries'].sort().join(','))
   throw Error('Unexpected staged publication metadata');
  pages.push({index:doc.index,count:doc.count,firstStudentId:doc.firstStudentId,
   lastStudentId:doc.lastStudentId,entries:doc.entries});
 }
 const checked=verifyCompleteStagedClass({authoritativeInput:fresh,stagedBatches:pages,reviewDigest:latest.digest});
 await requireAdmin();
 // A separate, durable manifest exists ONLY after every stored page passes
 // authoritative roster, component, digest and membership verification.
 // It is not a publication pointer and cannot be read by Firebase clients.
 const manifest={
  format:'smss-v47-verified-staging-manifest-v1',
  state:'staged_verified_not_published',schoolId,publicationId,
  classId:checked.classId,subjectId:checked.subjectId,examId:checked.examId,
  settingsRevision:latest.settingsRevision,rosterRevision:latest.rosterRevision,
  digest:checked.digest,rosterCount:checked.rosterCount,batchCount:checked.batchCount,
  verifiedBy:actorUid,writeAuthorized:false,publicationAllowed:false
 };
 const manifestRef=api.doc(db,'schools',schoolId,'marks_staging',publicationId);
 await api.runTransaction(db,async tx=>{
  if(typeof tx?.get!=='function'||typeof tx?.set!=='function')throw TypeError('Trusted Firestore transaction required');
  const snap=await tx.get(manifestRef);
  if(snapExists(snap)){
   if(!sameMarkJson(dataOf(snap),manifest))
    throw Error('Existing staged manifest conflicts with authoritative verification');
  }else tx.set(manifestRef,manifest);
 });
 return Object.freeze({staged:true,schoolId,publicationId,classId:checked.classId,
  subjectId:checked.subjectId,examId:checked.examId,rosterCount:checked.rosterCount,
  batchCount:checked.batchCount,existingPages:reused,digest:checked.digest,
  writeAuthorized:false,publicationAllowed:false,
  warning:'STAGING ONLY: no official marks, grade sheets or publication pointer changed.'});
}
