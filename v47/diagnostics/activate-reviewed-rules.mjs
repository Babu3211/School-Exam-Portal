// Official Firebase Rules Management API, using existing IAM permissions only.
// This does not change IAM, enable services, touch documents, or deploy Hosting.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const project='smss-exam-portal-v47',root='projects/'+project;
const releaseName=root+'/releases/cloud.firestore';
// Verified deployment 45408831333, commit 85d1a519: exact prior ruleset and source blob.
const expectedPrevious=root+'/rulesets/4059796c-b1b7-4742-a599-ab0da55bcbcf';
const expectedPreviousBlob='879412ed98e7e7fe33dbf49a048479234aef4d7a';
const requireAdmin=createRequire(new URL('../../v47-runtime/package.json',import.meta.url));
const {cert}=requireAdmin('firebase-admin/app');
if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.GITHUB_REF!=='refs/heads/smss-v47-multischool-work')throw Error('Isolated V47 branch and real project required');
const key=JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
if(key.type!=='service_account'||key.project_id!==project)throw Error('V47-only service account required');
const credential=cert(key);
const content=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
const normalize=x=>String(x??'').replace(/\r\n/g,'\n').trim();
const validRuleset=x=>typeof x==='string'&&x.startsWith(root+'/rulesets/')&&/^[A-Za-z0-9_-]+$/.test(x.slice((root+'/rulesets/').length));
async function call(method,path,body){
 const {access_token}=await credential.getAccessToken();
 const response=await fetch('https://firebaserules.googleapis.com/v1/'+path,{method,headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(60000),...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!response.ok)throw Error(method+' Firebase Rules API returned HTTP '+response.status+'; stopped without changing IAM or retrying a denied request');
 return response.json();
}
async function matches(name){
 if(!validRuleset(name))throw Error('Unexpected V47 ruleset');
 const data=await call('GET',name);
 const files=data.source?.files??[];
 return files.length===1&&normalize(files[0].content)===normalize(content);
}
async function verifyPriorSource(name){
 if(name!==expectedPrevious)throw Error('Live rules changed since reviewed deployment; refuse to overwrite');
 const data=await call('GET',name),files=data.source?.files??[];
 if(files.length!==1||typeof files[0].content!=='string')throw Error('Unexpected prior rules source');
 const bytes=Buffer.from(files[0].content,'utf8');
 const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(blob!==expectedPreviousBlob)throw Error('Prior rules source fingerprint differs; refuse to overwrite');
}
async function main(){
 const before=await call('GET',releaseName);
 if(await matches(before.rulesetName)){console.log('Reviewed V47 rules already active; no write required');return}
 await verifyPriorSource(before.rulesetName);
 console.log('Rollback ruleset: '+before.rulesetName);
 // Ruleset creation is validated by the official API, not yet enforced.
 const created=await call('POST',root+'/rulesets',{source:{files:[{name:'firestore.rules',content}]}});
 if(!validRuleset(created.name)||!await matches(created.name))throw Error('Created ruleset differs from reviewed source; release unchanged');
 console.log('Validated V47 ruleset: '+created.name);
 const latest=await call('GET',releaseName);
 if(latest.rulesetName!==expectedPrevious)throw Error('Live release changed during validation; refuse to overwrite');
 const updated=await call('PATCH',releaseName,{release:{name:releaseName,rulesetName:created.name},updateMask:'rulesetName'});
 if(updated.rulesetName!==created.name)throw Error('Release update not confirmed; inspect live state before retry');
 const after=await call('GET',releaseName);
 if(after.rulesetName!==created.name||!await matches(after.rulesetName))throw Error('Live rules verification failed; inspect state before retry');
 console.log('SUCCESS: reviewed V47 Firestore rules active and source verified');
}
await main().catch(e=>{console.error(e.message);process.exitCode=1});
