// Pure state-transition validation for a future trusted-server publication
// executor. This does not write Firestore or authorize a browser to publish.
export function planOfficialPublicationPointerSwitch({currentPointer,stagedVerification,publicationId,actorUid,expectedPreviousId=null}){
 if(!stagedVerification||stagedVerification.valid!==true||
  stagedVerification.writeAuthorized!==false||stagedVerification.publicationAllowed!==false||
  typeof stagedVerification.digest!=='string'||!/^[a-f0-9]{64}$/.test(stagedVerification.digest)||
  !Number.isSafeInteger(stagedVerification.rosterCount)||stagedVerification.rosterCount<1||stagedVerification.rosterCount>1500||
  !Number.isSafeInteger(stagedVerification.batchCount)||stagedVerification.batchCount!==Math.ceil(stagedVerification.rosterCount/100))
  throw new Error('Complete staged class verification required');
 for(const key of ['schoolId','classId','subjectId','examId']){
  if(typeof stagedVerification[key]!=='string'||!stagedVerification[key])throw new Error('Missing publication scope: '+key);
 }
 if(typeof publicationId!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(publicationId))throw new Error('Invalid server-owned publication ID');
 if(typeof actorUid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(actorUid))throw new Error('Verified admin UID required');
 if(expectedPreviousId!==null&&(typeof expectedPreviousId!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(expectedPreviousId)))throw new Error('Invalid previous publication ID');
 if(currentPointer!==null&&(!currentPointer||typeof currentPointer!=='object'||Array.isArray(currentPointer)))throw new Error('Invalid current publication pointer');
 const previous=currentPointer?.publicationId??null;
 if(previous!==expectedPreviousId)throw new Error('Concurrent publication detected; reload before committing');
 if(previous===publicationId)throw new Error('Publication ID cannot replace itself');
 if(currentPointer!==null){
  for(const key of ['schoolId','classId','subjectId','examId']){
   if(currentPointer[key]!==stagedVerification[key])throw new Error('Publication pointer scope mismatch');
  }
 }
 return Object.freeze({
  schoolId:stagedVerification.schoolId,classId:stagedVerification.classId,
  subjectId:stagedVerification.subjectId,examId:stagedVerification.examId,
  publicationId,previousPublicationId:previous,rosterCount:stagedVerification.rosterCount,
  digest:stagedVerification.digest,approvedBy:actorUid,
  requiresAtomicCompareAndSwap:true,writeAuthorized:false,publicationAllowed:false
 });
}
