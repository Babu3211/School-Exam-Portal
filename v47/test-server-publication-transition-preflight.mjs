import assert from 'node:assert/strict';
import {planConfiguredPublicationStaging} from './configured-publication-staging-plan.mjs';
import {fingerprintConfiguredClassReview} from './server-class-review-fingerprint.mjs';
import {verifyPublicationTransition} from './server-publication-transition-preflight.mjs';
const scope={schoolId:'12345',classId:'9',subjectId:'computer',examId:'final'};
const expectedStudentIds=Array.from({length:1500},(_,i)=>'student'+String(i).padStart(4,'0'));
const input={...scope,actor:{uid:'admin123',role:'school_admin',active:true,schoolId:scope.schoolId},
 settings:{...scope,active:true,components:[{key:'written',name:'Written',fullMarks:80},{key:'practical',name:'Practical',fullMarks:20}]},
 expectedStudentIds,drafts:expectedStudentIds.map(studentId=>({studentId,values:{written:70,practical:18}})),
 settingsRevision:'s1',rosterRevision:'r1'};
const review=fingerprintConfiguredClassReview(input);
const confirmation=Object.fromEntries(['format','schoolId','classId','subjectId','examId','settingsRevision','rosterRevision','digestAlgorithm','digest'].map(k=>[k,review[k]]));
const stagedBatches=JSON.parse(JSON.stringify(planConfiguredPublicationStaging(input).batches));
const base={authoritativeInput:input,stagedBatches,confirmation,currentPointer:null,publicationId:'pub_00000001',actorUid:'admin123'};
const result=verifyPublicationTransition(base);
assert.equal(result.rosterCount,1500);
assert.equal(result.batchCount,15);
assert.equal(result.requiresAtomicCompareAndSwap,true);
assert.equal(result.writeAuthorized,false);
assert.equal(result.publicationAllowed,false);
assert.throws(()=>verifyPublicationTransition({...base,actorUid:'anotherAdmin'}),/actor differs/);
assert.throws(()=>verifyPublicationTransition({...base,authoritativeInput:{...input,actor:{...input.actor,role:'viewer'}}}),/Verified school admin/);
assert.throws(()=>verifyPublicationTransition({...base,confirmation:{...confirmation,digest:'b'.repeat(64)}}),/stale or altered/);
assert.throws(()=>verifyPublicationTransition({...base,stagedBatches:stagedBatches.slice(1)}),/Incomplete staged batch/);
assert.throws(()=>verifyPublicationTransition({...base,authoritativeInput:{...input,rosterRevision:'r2'}}),/stale or altered/);
const old={...scope,publicationId:'pub_00000000'};
assert.throws(()=>verifyPublicationTransition({...base,currentPointer:old}),/Concurrent publication/);
assert.equal(verifyPublicationTransition({...base,currentPointer:old,expectedPreviousId:old.publicationId}).previousPublicationId,old.publicationId);

// Boundary coverage: one-student and 500-student classes use the same
// complete review, staged verification and compare-and-swap preflight.
for(const size of [1,500]){
 const ids=expectedStudentIds.slice(0,size);
 const smaller={...input,expectedStudentIds:ids,drafts:input.drafts.slice(0,size)};
 const smallerReview=fingerprintConfiguredClassReview(smaller);
 const smallerConfirmation=Object.fromEntries(['format','schoolId','classId','subjectId','examId','settingsRevision','rosterRevision','digestAlgorithm','digest'].map(k=>[k,smallerReview[k]]));
 const smallerBatches=JSON.parse(JSON.stringify(planConfiguredPublicationStaging(smaller).batches));
 const checked=verifyPublicationTransition({...base,authoritativeInput:smaller,confirmation:smallerConfirmation,stagedBatches:smallerBatches});
 assert.equal(checked.rosterCount,size);
 assert.equal(checked.batchCount,Math.ceil(size/100));
 assert.equal(checked.publicationAllowed,false);
}

console.log('V47 publication preflight: 1/500/1500 rows, bounded batches, actor binding, stale review, incomplete stage and CAS conflict checks; no writes');
