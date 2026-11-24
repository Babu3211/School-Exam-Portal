import assert from 'node:assert/strict';
import {runSavedClassPublication} from './saved-class-publication-client.mjs';
const scope={schoolId:'12345',classId:'9',subjectId:'math',examId:'final'};
const digest='a'.repeat(64),publicationId='pub_new_001',previousPublicationId='pub_old_001';
const review={...scope,format:'smss-v47-class-review-digest-v1',digestAlgorithm:'sha256',digest,settingsRevision:'s1',rosterRevision:'r1',rosterCount:101,writeAuthorized:false,publicationAllowed:false};
const reviewed={review,previousPublicationId,readOnly:true,stageAuthorized:false,publishAuthorized:false};
const staged={stage:{...scope,publicationId,digest,rosterCount:101,publicationAllowed:false,writeAuthorized:false},officialPublished:false};
const committed={officialPublished:true,cdcGradeApproved:false,result:{...scope,publicationId,digest,rosterCount:101,committed:true}};
const fixture=()=>{
 const requests=[],responses=[reviewed,staged,committed];
 const options={scope,getIdToken:async()=>'token',assertCurrent:()=>{},confirmStage:()=>true,confirmCommit:()=>true,
  fetchImpl:async(path,opts)=>{requests.push({path,opts});assert.equal(opts.redirect,'error');assert.equal(opts.headers.Authorization,'Bearer token');
   const response=responses.shift();return response?{ok:true,json:async()=>response}:{ok:false,status:503}}};
 return {requests,responses,options};
};
{
 const f=fixture();assert.equal((await runSavedClassPublication(f.options)).committed,true);
 assert.equal(f.requests.length,3);assert.equal(f.requests[0].opts.method,'GET');
 const body=JSON.parse(f.requests[2].opts.body);
 assert.equal(body.expectedPreviousId,previousPublicationId);assert.equal(body.publicationId,publicationId);
 assert.equal(body.confirmPublish,'PUBLISH OFFICIAL MARKS');
 assert.equal(Object.hasOwn(body,'entries'),false);
}
for(const [stage,commit,count] of [[false,true,1],[true,false,2]]){
 const f=fixture();const result=await runSavedClassPublication({...f.options,confirmStage:()=>stage,confirmCommit:()=>commit});
 assert.equal(result.committed,false);assert.equal(f.requests.length,count);
}
{
 const f=fixture();f.responses[0]={...reviewed,review:{...review,schoolId:'99999'}};
 await assert.rejects(runSavedClassPublication(f.options),/Invalid publication review/);assert.equal(f.requests.length,1);
}
{
 const f=fixture();f.responses[1]={...staged,stage:{...staged.stage,digest:'b'.repeat(64)}};
 await assert.rejects(runSavedClassPublication(f.options),/Invalid staged/);assert.equal(f.requests.length,2);
}
{
 const f=fixture();f.responses.pop();
 await assert.rejects(runSavedClassPublication(f.options),/503/);assert.equal(f.requests.length,3);
}
console.log('PASS saved class publication client: explicit stage/commit, CAS pointer, no raw writes, denied stale or disabled API');
