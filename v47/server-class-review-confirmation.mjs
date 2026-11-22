import {fingerprintConfiguredClassReview} from './server-class-review-fingerprint.mjs';

// Pure server-boundary confirmation check: no client-supplied actor, roster,
// settings, or marks are used as authority. A trusted caller must reload all
// authoritative inputs, including the current admin membership, before calling.
// This function never grants Firestore writes or flips an official pointer.
export function verifyClassReviewConfirmation({confirmation,authoritativeInput}){
 if(!confirmation||typeof confirmation!=='object'||Array.isArray(confirmation)||
  Object.keys(confirmation).sort().join(',')!=='digest,digestAlgorithm,examId,format,rosterRevision,schoolId,settingsRevision,subjectId,classId'.split(',').sort().join(',')){
  throw new Error('Invalid review confirmation fields');
 }
 if(confirmation.format!=='smss-v47-class-review-digest-v1'||confirmation.digestAlgorithm!=='sha256'||
  typeof confirmation.digest!=='string'||!/^[a-f0-9]{64}$/.test(confirmation.digest)){
  throw new Error('Invalid review confirmation digest');
 }
 if(!authoritativeInput||typeof authoritativeInput!=='object'||Array.isArray(authoritativeInput))throw new Error('Authoritative class snapshot required');
 const current=fingerprintConfiguredClassReview(authoritativeInput);
 for(const key of ['format','schoolId','classId','subjectId','examId','settingsRevision','rosterRevision','digestAlgorithm','digest']){
  if(confirmation[key]!==current[key])throw new Error('Review confirmation is stale or altered: '+key);
 }
 return Object.freeze({
  valid:true,schoolId:current.schoolId,classId:current.classId,
  subjectId:current.subjectId,examId:current.examId,rosterCount:current.rosterCount,
  digest:current.digest,writeAuthorized:false,publicationAllowed:false,
  warning:'Review verified only; official marks publication is not enabled.'
 });
}
