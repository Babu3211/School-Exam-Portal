import assert from 'node:assert/strict';
import {runSavedClassPublication} from './saved-class-publication-client.mjs';
const scope={schoolId:'12345',classId:'9',subjectId:'math',examId:'final'};
const digest='a'.repeat(64),publicationId='pub_new_001',previousPublicationId='pub_old_001';
const review={...scope,format:'smss-v47-class-review-digest-v1',digestAlgorithm:'sha256',digest,settingsRevision:'s1',rosterRevision:'r1',rosterCount:101,writeAuthorized:false,publicationAllowed:false};
const reviewed={review,previousPublicationId,readOnly:true,stageAuthorized:false,publishAuthorized:false};
const staged={stage:{...scope,publicationId,digest,rosterCount:101,publicationAllowed:false,writeAuthorized:false},officialPublished:false};
const committed={officialPublished:true,cdcGradeApproved:false,result:{...scope,publicationId,digest,rosterCount:101,committed:true}};
const runtime={format:'smss-v47-runtime-status-v1',version:'V47',publicationEnabled:true,atomicAttendanceEnabled:false,productionReady:false,cdcGradeApproved:false};
const fixture=()=>{
 const requests=[],responses=[runtime,reviewed,staged,committed];
 const options={scope,getIdToken:async()=>'token',assertCurrent:()=>{},confirmStage:()=>true,confirmCommit:()=>true,
  fetchImpl:async(path,opts)=>{requests.push({path,opts});assert.equal(opts.redirect,'error');if(path==='/api/v47/runtime-status'){assert.equal(opts.headers.Authorization,undefined);assert.equal(opts.credentials,'omit')}else assert.equal(opts.headers.Authorization,'Bearer token');
   const response=responses.shift();return response?{ok:true,json:async()=>response}:{ok:false,status:503}}};
 return {requests,responses,options};
};
{
 const f=fixture();assert.equal((await runSavedClassPublication(f.options)).committed,true);
 assert.equal(f.requests.length,4);assert.equal(f.requests[0].opts.method,'GET');
 const body=JSON.parse(f.requests[3].opts.body);
 assert.equal(body.expectedPreviousId,previousPublicationId);assert.equal(body.publicationId,publicationId);
 assert.equal(body.confirmPublish,'PUBLISH OFFICIAL MARKS');
 assert.equal(Object.hasOwn(body,'entries'),false);
}
for(const [stage,commit,count] of [[false,true,2],[true,false,3]]){
 const f=fixture();const result=await runSavedClassPublication({...f.options,confirmStage:()=>stage,confirmCommit:()=>commit});
 assert.equal(result.committed,false);assert.equal(f.requests.length,count);
}
{
 const f=fixture();f.responses[1]={...reviewed,review:{...review,schoolId:'99999'}};
 await assert.rejects(runSavedClassPublication(f.options),/Invalid publication review/);assert.equal(f.requests.length,2);
}
{
 const f=fixture();f.responses[2]={...staged,stage:{...staged.stage,digest:'b'.repeat(64)}};
 await assert.rejects(runSavedClassPublication(f.options),/Invalid staged/);assert.equal(f.requests.length,3);
}
{
 const f=fixture();f.responses.pop();
 await assert.rejects(runSavedClassPublication(f.options),/503/);assert.equal(f.requests.length,4);
}
console.log('PASS saved class publication client: explicit stage/commit, CAS pointer, no raw writes, denied stale or disabled API');

{
 const f=fixture();f.responses[0]={...runtime,publicationEnabled:false};
 const result=await runSavedClassPublication({...f.options,confirmStage:()=>assert.fail('Disabled runtime must not prompt for staging'),confirmCommit:()=>assert.fail('Disabled runtime must not prompt for publication')});
 assert.deepEqual(result,{committed:false,reviewOnly:true,rosterCount:101});
 assert.equal(f.requests.length,2);assert.ok(f.requests.every(r=>r.opts.method==='GET'));
}
for(const bad of [{format:'static-hosting-html'}, {...runtime,publicationEnabled:'true'}, {...runtime,version:'V46'}, {...runtime,productionReady:true}]){
 const f=fixture();f.responses[0]=bad;let tokens=0;
 await assert.rejects(runSavedClassPublication({...f.options,getIdToken:async()=>{tokens++;return 'token'}}),/runtime unavailable/);
 assert.equal(tokens,0);assert.equal(f.requests.length,1);
}
{
 const f=fixture();let tokens=0;
 await assert.rejects(runSavedClassPublication({...f.options,getIdToken:async()=>{tokens++;return 'token'},fetchImpl:async()=>({ok:true,json:async()=>{throw Error('HTML')}})}),/runtime unavailable/);
 assert.equal(tokens,0);
}
console.log('PASS runtime probe: missing or malformed server sends no token; disabled publication permits review only, no stage or commit');
