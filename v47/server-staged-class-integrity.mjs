import {sameMarkJson} from './mark-json-equality.mjs';
import {planConfiguredPublicationStaging} from './configured-publication-staging-plan.mjs';
import {fingerprintConfiguredClassReview} from './server-class-review-fingerprint.mjs';

// Verifies a *complete* set of staged pages against a freshly reconstructed
// authoritative snapshot. No Firestore access, writes, or publication approval.
export function verifyCompleteStagedClass({authoritativeInput,stagedBatches,reviewDigest}){
 if(typeof reviewDigest!=='string'||!/^[a-f0-9]{64}$/.test(reviewDigest))throw new Error('Valid server review digest required');
 const plan=planConfiguredPublicationStaging(authoritativeInput);
 const review=fingerprintConfiguredClassReview(authoritativeInput);
 if(review.digest!==reviewDigest)throw new Error('Authoritative class review changed');
 if(!Array.isArray(stagedBatches)||stagedBatches.length!==plan.batches.length)throw new Error('Incomplete staged batch count');
 const seen=new Set();
 let count=0;
 for(let index=0;index<plan.batches.length;index++){
  const expected=plan.batches[index],actual=stagedBatches[index];
  if(!actual||typeof actual!=='object'||Array.isArray(actual)||
   Object.keys(actual).sort().join(',')!=='count,entries,firstStudentId,index,lastStudentId'.split(',').sort().join(','))throw new Error('Malformed staged batch');
  if(actual.index!==index||actual.count!==expected.count||actual.firstStudentId!==expected.firstStudentId||actual.lastStudentId!==expected.lastStudentId||
   !Array.isArray(actual.entries)||actual.entries.length!==expected.entries.length)throw new Error('Staged batch order or size mismatch');
  for(let j=0;j<expected.entries.length;j++){
   const row=actual.entries[j],canonical=expected.entries[j];
   if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).sort().join(',')!=='isAbsent,studentId,totalObtained,values'.split(',').sort().join(',')||
    seen.has(row.studentId)||!sameMarkJson(row,canonical))throw new Error('Staged student row missing, duplicated or altered');
   seen.add(row.studentId);count++;
  }
 }
 if(count!==plan.rosterCount||seen.size!==plan.rosterCount)throw new Error('Staged roster incomplete');
 return Object.freeze({valid:true,schoolId:plan.schoolId,classId:plan.classId,subjectId:plan.subjectId,examId:plan.examId,
  rosterCount:count,batchCount:plan.batches.length,digest:review.digest,writeAuthorized:false,publicationAllowed:false});
}
