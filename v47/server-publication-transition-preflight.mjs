import {verifyCompleteStagedClass} from './server-staged-class-integrity.mjs';
import {verifyClassReviewConfirmation} from './server-class-review-confirmation.mjs';
import {planOfficialPublicationPointerSwitch} from './server-publication-pointer-plan.mjs';

// Trusted-server preflight. The caller must independently authenticate the
// school admin and reload roster, settings, drafts, staged pages and pointer.
// No Firestore writes, permissions, or publication approval are granted here.
export function verifyPublicationTransition({
 authoritativeInput,stagedBatches,confirmation,currentPointer,
 expectedPreviousId=null,publicationId,actorUid
}){
 const review=verifyClassReviewConfirmation({confirmation,authoritativeInput});
 const staged=verifyCompleteStagedClass({
  authoritativeInput,stagedBatches,reviewDigest:review.digest
 });
 if(review.schoolId!==staged.schoolId||review.classId!==staged.classId||
    review.subjectId!==staged.subjectId||review.examId!==staged.examId||
    review.rosterCount!==staged.rosterCount)throw new Error('Review and staging scope mismatch');
 const pointer=planOfficialPublicationPointerSwitch({
  currentPointer,stagedVerification:staged,expectedPreviousId,publicationId,actorUid
 });
 if(pointer.digest!==review.digest)throw new Error('Publication digest mismatch');
 return Object.freeze({
  valid:true,schoolId:pointer.schoolId,classId:pointer.classId,
  subjectId:pointer.subjectId,examId:pointer.examId,
  rosterCount:pointer.rosterCount,batchCount:staged.batchCount,
  digest:pointer.digest,publicationId:pointer.publicationId,
  previousPublicationId:pointer.previousPublicationId,
  requiresAtomicCompareAndSwap:true,
  writeAuthorized:false,publicationAllowed:false
 });
}
