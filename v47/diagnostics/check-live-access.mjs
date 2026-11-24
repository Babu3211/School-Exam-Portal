// Read-only V47 diagnostic, run only by the authorized project credential.
// Never print user identifiers, rule source, access tokens, or credentials.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const projectId='smss-exam-portal-v47';
const requireAdmin=createRequire(new URL('../../v47-runtime/package.json',import.meta.url));
const {initializeApp,cert,deleteApp}=requireAdmin('firebase-admin/app');
const {getFirestore}=requireAdmin('firebase-admin/firestore');
const {getAuth}=requireAdmin('firebase-admin/auth');
if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Unexpected emulator environment');
const key=JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
if(key.project_id!==projectId||key.type!=='service_account')throw Error('Dedicated V47 credential required');
const credential=cert(key),app=initializeApp({credential,projectId},'v47-read-only-diagnostic');
let blocked=false;
const summarizeError=e=>String(e?.code??e?.status??'unknown').replace(/[^A-Za-z0-9_/-]/g,'').slice(0,70);
async function getJson(path){
 const {access_token}=await credential.getAccessToken();
 const response=await fetch('https://firebaserules.googleapis.com/v1/'+path,{headers:{Authorization:'Bearer '+access_token},redirect:'error'});
 if(!response.ok){const e=Error('Rules API unavailable');e.status=response.status;throw e}
 return response.json();
}
try{
 try{
  const release=await getJson('projects/'+projectId+'/releases/cloud.firestore');
  if(!release.rulesetName?.startsWith('projects/'+projectId+'/rulesets/'))throw Error('Unexpected ruleset path');
  const ruleset=await getJson(release.rulesetName);
  const current=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8').replace(/\r\n/g,'\n').trim();
  const sources=ruleset.source?.files??[];
  const same=sources.length===1&&String(sources[0].content??'').replace(/\r\n/g,'\n').trim()===current;
  console.log('Live Firestore rules match reviewed V47 source: '+(same?'YES':'NO'));
  if(!same)blocked=true;
 }catch(e){console.log('Rules metadata read unavailable: '+summarizeError(e));blocked=true}
 try{
  const db=getFirestore(app);
  const snap=await db.collection('v47_super_admins').where('active','==',true).limit(20).get();
  console.log('Active root Super Admin documents (bounded at 20): '+snap.size);
  if(!snap.size)blocked=true;
  try{
   const users=await getAuth(app).getUsers(snap.docs.map(d=>({uid:d.id})));
   console.log('Matching enabled Auth accounts: '+users.users.filter(u=>!u.disabled).length);
   if(users.users.filter(u=>!u.disabled).length!==snap.size)blocked=true;
  }catch(e){console.log('Auth UID match check unavailable: '+summarizeError(e));blocked=true}
 }catch(e){console.log('Registry metadata read unavailable: '+summarizeError(e));blocked=true}
}finally{await deleteApp(app)}
if(blocked)process.exitCode=1;
