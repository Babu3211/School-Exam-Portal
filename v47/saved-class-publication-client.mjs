// Development server flow only. No raw Firestore writes, no assumed server availability.
const keys=['format','schoolId','classId','subjectId','examId','settingsRevision','rosterRevision','digestAlgorithm','digest'];
const id=/^[A-Za-z0-9_-]{8,128}$/;
export async function runSavedClassPublication({scope,getIdToken,fetchImpl,assertCurrent,confirmStage,confirmCommit,onStage=()=>{},onCommit=()=>{}}){
 if(!scope||Object.keys(scope).sort().join(',')!=='classId,examId,schoolId,subjectId'||
 !/^\d{5,20}$/.test(scope.schoolId)||!Object.values(scope).every(v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v))||
 ![getIdToken,fetchImpl,assertCurrent,confirmStage,confirmCommit,onStage,onCommit].every(f=>typeof f==='function'))throw Error('Verified scope and callbacks required');
 const same=value=>value&&Object.entries(scope).every(([k,v])=>value[k]===v);
 const request=async(path,body)=>{
  assertCurrent();const token=await getIdToken();assertCurrent();
  if(typeof token!=='string'||!token.trim())throw Error('Verified login required');
  const response=await fetchImpl(path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',credentials:'same-origin',redirect:'error'});
  assertCurrent();if(!response?.ok)throw Error('Isolated publication API unavailable or request refused ('+(response?.status??'network')+')');
  let data;try{data=await response.json()}catch{throw Error('Isolated publication API response unavailable')};assertCurrent();return data;
 };
 // Probe the same-origin Node process before sending any Firebase ID token.
 // Static Hosting may return HTML with HTTP 200; that is not a valid runtime.
 assertCurrent();
 let runtime;
 try{
  const probe=await fetchImpl('/api/v47/runtime-status',{method:'GET',headers:{Accept:'application/json'},cache:'no-store',credentials:'omit',redirect:'error'});
  if(!probe?.ok)throw Error('Unavailable');
  runtime=await probe.json();
 }catch{throw Error('V47 publication runtime unavailable')}
 assertCurrent();
 if(runtime?.format!=='smss-v47-runtime-status-v1'||runtime.version!=='V47'||
    typeof runtime.publicationEnabled!=='boolean'||typeof runtime.atomicAttendanceEnabled!=='boolean'||
    runtime.productionReady!==false||runtime.cdcGradeApproved!==false)
  throw Error('V47 publication runtime unavailable');
 const response=await request('/api/v47/publication-review?'+new URLSearchParams(scope));
 const {review,previousPublicationId}=response??{};
 if(!same(review)||response.readOnly!==true||response.stageAuthorized!==false||response.publishAuthorized!==false||
 review.format!=='smss-v47-class-review-digest-v1'||review.digestAlgorithm!=='sha256'||!/^[a-f0-9]{64}$/.test(review.digest??'')||
 !Number.isInteger(review.rosterCount)||review.rosterCount<1||review.rosterCount>1500||
 !['settingsRevision','rosterRevision'].every(k=>typeof review[k]==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(review[k]))||
 review.writeAuthorized!==false||review.publicationAllowed!==false||
 !(previousPublicationId===null||typeof previousPublicationId==='string'&&id.test(previousPublicationId)))
 throw Error('Invalid publication review response');
 // Preserve the authenticated read-only review when writes are disabled.
 if(!runtime.publicationEnabled)return {committed:false,reviewOnly:true,rosterCount:review.rosterCount};
 if(await confirmStage(review)!==true)return {committed:false};
 assertCurrent();
 const confirmation=Object.fromEntries(keys.map(k=>[k,review[k]]));
 const staged=await request('/api/v47/publication/stage',{scope,confirmation,confirmStage:true});
 const stage=staged?.stage;
 if(!same(stage)||!id.test(stage.publicationId??'')||stage.digest!==review.digest||stage.rosterCount!==review.rosterCount||
 stage.publicationAllowed!==false||stage.writeAuthorized!==false||staged.officialPublished!==false)
 throw Error('Invalid staged publication response');
 onStage(stage);
 if(await confirmCommit({review,publicationId:stage.publicationId,previousPublicationId})!==true)return {committed:false,staged:true};
 assertCurrent();onCommit();
 const result=await request('/api/v47/publication/commit',{scope,confirmation,publicationId:stage.publicationId,expectedPreviousId:previousPublicationId,confirmPublish:'PUBLISH OFFICIAL MARKS'});
 if(result?.officialPublished!==true||result.cdcGradeApproved!==false||!same(result.result)||
 result.result.committed!==true||result.result.publicationId!==stage.publicationId||result.result.digest!==review.digest||
 result.result.rosterCount!==review.rosterCount)throw Error('Unverified publication outcome');
 return {committed:true,publicationId:stage.publicationId};
}
