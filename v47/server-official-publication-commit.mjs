// Trusted-server-only publication commit. NOT connected to the V47 browser or
// deployed API. Server callers MUST provide Firebase Admin SDK transactions,
// reloading all authoritative roster/settings/draft records through that SAME
// transaction. This module never accesses V46/main or accepts client actor data.
import {loadTrustedPublicationPreflight,officialClassPointerId} from './server-publication-authoritative-preflight.mjs';
import {verifyPublicationTransition} from './server-publication-transition-preflight.mjs';
import {computePublishedPagesDigest} from './server-publication-content-digest.mjs';

const exists=s=>typeof s?.exists==='function'?s.exists():s?.exists===true;
const value=s=>exists(s)?s.data():null;
const names=o=>Object.keys(o).sort().join(',');
const manifestFields=['format','state','schoolId','publicationId','classId','subjectId','examId','settingsRevision','rosterRevision','digest','rosterCount','batchCount','verifiedBy','writeAuthorized','publicationAllowed'].sort().join(',');
const pageFields=['format','schoolId','publicationId','classId','subjectId','examId','digest','index','count','firstStudentId','lastStudentId','entries'].sort().join(',');

/**
 * A complete-class pointer changes in ONE Firestore transaction together with
 * a committed publication header and an immutable audit event. Staged pages
 * are already written and verified, and are read back inside the transaction.
 *
 * Requires a TRUSTED transactional loader that reads live school/class roster,
 * Examination Settings and official mark drafts using tx.get(), not a browser
 * payload. The caller must ensure all related mutations use those records.
 * This does not enable UI publishing or release approval.
 */
export async function commitTrustedOfficialClassPublication({
 db,api,schoolId,classId,subjectId,examId,publicationId,actorUid,
 confirmation,expectedPreviousId=null,verifyAdmin,loadAuthoritative,
 loadTransactionalAuthoritative
}){
 if(typeof api?.runTransaction!=='function'||typeof api?.getDoc!=='function'||typeof api?.doc!=='function')
  throw new TypeError('Trusted Firebase Admin Firestore adapter required');
 if(typeof loadTransactionalAuthoritative!=='function')
  throw new TypeError('Transactional authoritative roster/settings/drafts loader required');
 const reviewed=await loadTrustedPublicationPreflight({
  db,api,schoolId,classId,subjectId,examId,publicationId,actorUid,
  confirmation,expectedPreviousId,verifyAdmin,loadAuthoritative
 });
 const pointerId=officialClassPointerId({classId,subjectId,examId});
 if(reviewed.pointerId!==pointerId)throw new Error('Publication scope changed after preflight');
 const ref=(...parts)=>api.doc(db,'schools',schoolId,...parts);
 const base=['marks_staging',publicationId];
 const pointerRef=ref('official_marks_pointers',pointerId);
 const publicationRef=ref('official_marks_publications',publicationId);
 const auditRef=ref('official_marks_audit',publicationId);
 const committedAt=new Date().toISOString();
 return api.runTransaction(db,async transaction=>{
  if(typeof transaction?.get!=='function'||typeof transaction?.set!=='function')
   throw new TypeError('Trusted Firestore transaction required');
  // These membership reads participate in the same compare-and-swap as the
  // marks pointer; an account removed during review must not publish.
  const school=value(await transaction.get(ref()));
  const member=value(await transaction.get(ref('members',actorUid)));
  if(school?.active!==true||member?.uid!==actorUid||member?.schoolId!==schoolId||
     member?.active!==true||member?.role!=='school_admin')
   throw new Error('School Admin was revoked before official publication');
  const manifest=value(await transaction.get(ref(...base)));
  if(!manifest||names(manifest)!==manifestFields||
     manifest.format!=='smss-v47-verified-staging-manifest-v1'||
     manifest.state!=='staged_verified_not_published'||
     manifest.schoolId!==schoolId||manifest.publicationId!==publicationId||
     manifest.classId!==classId||manifest.subjectId!==subjectId||manifest.examId!==examId||
     manifest.verifiedBy!==actorUid||manifest.writeAuthorized!==false||
     manifest.publicationAllowed!==false||manifest.digest!==reviewed.digest||
     manifest.rosterCount!==reviewed.rosterCount||
     manifest.batchCount!==reviewed.batchCount)
   throw new Error('Staging manifest changed before official publication');
  const currentPointer=value(await transaction.get(pointerRef));
  if(value(await transaction.get(publicationRef))!==null||
     value(await transaction.get(auditRef))!==null)
   throw new Error('Publication ID or audit ID already committed');
  const pages=[];
  for(let i=0;i<manifest.batchCount;i++){
   const page=value(await transaction.get(ref(...base,'batches','b'+String(i).padStart(4,'0'))));
   if(!page||names(page)!==pageFields||page.format!=='smss-v47-staged-page-v1'||
      page.schoolId!==schoolId||page.publicationId!==publicationId||
      page.classId!==classId||page.subjectId!==subjectId||page.examId!==examId||
      page.digest!==manifest.digest)
    throw new Error('Staged page changed before official publication: '+i);
   pages.push({index:page.index,count:page.count,firstStudentId:page.firstStudentId,
    lastStudentId:page.lastStudentId,entries:page.entries});
  }
  // Trusted adapter must read the entire authoritative source via transaction
  // reads, so a roster/mark/settings mutation conflicts with the pointer CAS.
  const authoritativeInput=await loadTransactionalAuthoritative({
   transaction,schoolId,classId,subjectId,examId,uid:actorUid
  });
  if(authoritativeInput?.schoolId!==schoolId||
     authoritativeInput?.classId!==classId||
     authoritativeInput?.subjectId!==subjectId||
     authoritativeInput?.examId!==examId||
     authoritativeInput?.actor?.uid!==actorUid||
     authoritativeInput?.actor?.schoolId!==schoolId||
     authoritativeInput?.actor?.role!=='school_admin'||
     authoritativeInput?.actor?.active!==true||
     manifest.settingsRevision!==authoritativeInput.settingsRevision||
     manifest.rosterRevision!==authoritativeInput.rosterRevision)
   throw new Error('Transactional class snapshot or admin identity changed');
  const checked=verifyPublicationTransition({
   authoritativeInput,stagedBatches:pages,confirmation,currentPointer,
   expectedPreviousId,publicationId,actorUid
  });
  if(checked.digest!==reviewed.digest||
     checked.rosterCount!==reviewed.rosterCount||
     checked.batchCount!==reviewed.batchCount||
     checked.previousPublicationId!==reviewed.previousPublicationId)
   throw new Error('Publication changed between preflight and transaction');
  const scope={schoolId,classId,subjectId,examId};
  // Bind the immutable persisted page CONTENT to the atomic publication.
  // A later valid-looking score change must not silently become official.
  const contentDigest=computePublishedPagesDigest(pages);
  transaction.set(publicationRef,{
   ...scope,publicationId,state:'committed',digest:checked.digest,contentDigest,
   rosterCount:checked.rosterCount,batchCount:checked.batchCount,
   previousPublicationId:checked.previousPublicationId,
   approvedBy:actorUid,committedAt
  });
  transaction.set(pointerRef,{
   ...scope,publicationId,digest:checked.digest,contentDigest,rosterCount:checked.rosterCount
  });
  transaction.set(auditRef,{
   ...scope,publicationId,previousPublicationId:checked.previousPublicationId,
   digest:checked.digest,contentDigest,rosterCount:checked.rosterCount,approvedBy:actorUid,
   action:'official_class_marks_publish',committedAt
  });
  return Object.freeze({
   committed:true,...scope,publicationId,pointerId,digest:checked.digest,
   rosterCount:checked.rosterCount,batchCount:checked.batchCount,
   previousPublicationId:checked.previousPublicationId,
   warning:'Trusted-server transaction only; browser publication, official reader API and release acceptance remain disabled.'
  });
 });
}
