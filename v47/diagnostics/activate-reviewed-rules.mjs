// Official Firebase Rules Management API, using existing IAM permissions only.
// This does not change IAM, enable services, touch documents, or deploy Hosting.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const project='smss-exam-portal-v47',root='projects/'+project;
const releaseName=root+'/releases/cloud.firestore';
const expectedPrevious=root+'/rulesets/44ae23f0-b828-405d-8cf4-d287a71cfe00';
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
async function main(){
 const before=await call('GET',releaseName);
 if(await matches(before.rulesetName)){console.log('Reviewed V47 rules already active; no write required');return}
 if(before.rulesetName!==expectedPrevious)throw Error('Live rules changed since reviewed diagnostic; refuse to overwrite');
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
