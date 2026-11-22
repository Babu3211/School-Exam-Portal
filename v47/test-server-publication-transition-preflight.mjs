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
const tampered=JSON.parse(JSON.stringify(stagedBatches));
tampered[0].entries[0].values.written=71;
assert.throws(()=>verifyPublicationTransition({...base,stagedBatches:tampered}),/altered/);
const duplicate=JSON.parse(JSON.stringify(stagedBatches));
duplicate[1].entries[0].studentId=duplicate[0].entries[0].studentId;
assert.throws(()=>verifyPublicationTransition({...base,stagedBatches:duplicate}),/duplicated or altered/);
assert.throws(()=>verifyPublicationTransition({...base,authoritativeInput:{...input,schoolId:'67890'}}),/Verified school admin/);
assert.throws(()=>verifyPublicationTransition({...base,authoritativeInput:{...input,rosterRevision:'r2'}}),/stale or altered/);
const old={...scope,publicationId:'pub_00000000',digest:'a'.repeat(64),rosterCount:1500};
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


// Marks must use the school's Examination Settings, including Computer
// configurations that are not the historical fixed 4/36/10 split.
for(const components of [
 [{key:'theory',name:'Theory',fullMarks:40},{key:'practical',name:'Practical',fullMarks:60}],
 [{key:'internal',name:'Internal',fullMarks:4},{key:'written',name:'Written',fullMarks:36},{key:'practical',name:'Practical',fullMarks:10}]
]){
 const ids=expectedStudentIds.slice(0,2);
 const values=Object.fromEntries(components.map(c=>[c.key,c.fullMarks]));
 const configured={...input,expectedStudentIds:ids,drafts:ids.map(studentId=>({studentId,values:{...values}})),settings:{...input.settings,components}};
 const reviewed=fingerprintConfiguredClassReview(configured);
 const approved=Object.fromEntries(['format','schoolId','classId','subjectId','examId','settingsRevision','rosterRevision','digestAlgorithm','digest'].map(k=>[k,reviewed[k]]));
 const pages=JSON.parse(JSON.stringify(planConfiguredPublicationStaging(configured).batches));
 assert.equal(verifyPublicationTransition({...base,authoritativeInput:configured,confirmation:approved,stagedBatches:pages}).rosterCount,2);
 const excessive={...configured,drafts:[{studentId:ids[0],values:{...values,[components[0].key]:components[0].fullMarks+1}},configured.drafts[1]]};
 assert.throws(()=>verifyPublicationTransition({...base,authoritativeInput:excessive,confirmation:approved,stagedBatches:pages}),/Complete verified class review/);
}

console.log('V47 publication preflight: 1/500/1500 rows, bounded batches, actor binding, stale review, incomplete stage and CAS conflict checks; no writes');
