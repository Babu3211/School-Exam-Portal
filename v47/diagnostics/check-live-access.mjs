// Read-only V47 diagnostic, run only by the authorized project credential.
// Never print user identifiers, rule source, access tokens, or credentials.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {schoolRegistryIssues} from '../school-list-service.mjs';
const projectId='smss-exam-portal-v47';
const requireAdmin=createRequire(new URL('../../v47-runtime/package.json',import.meta.url));
const {initializeApp,cert,deleteApp}=requireAdmin('firebase-admin/app');
const {getFirestore}=requireAdmin('firebase-admin/firestore');
const {getAuth}=requireAdmin('firebase-admin/auth');
if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Unexpected emulator environment');
const key=JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
if(key.project_id!==projectId||key.type!=='service_account')throw Error('Dedicated V47 credential required');
const credential=cert(key),app=initializeApp({credential,projectId},'v47-read-only-diagnostic');
const preflight=process.argv.length===3&&process.argv[2]==='--before-rules-deploy';
if(process.argv.length>2&&!preflight)throw Error('Unknown diagnostic option');
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
  if(preflight)console.log('Previous V47 ruleset for rollback: '+release.rulesetName);
  const ruleset=await getJson(release.rulesetName);
  const current=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8').replace(/\r\n/g,'\n').trim();
  const sources=ruleset.source?.files??[];
  const same=sources.length===1&&String(sources[0].content??'').replace(/\r\n/g,'\n').trim()===current;
  console.log('Live Firestore rules match reviewed V47 source: '+(same?'YES':'NO'));
  if(!same&&!preflight)blocked=true;
 }catch(e){console.log('Rules metadata read unavailable: '+summarizeError(e));blocked=true}
 try{
  const db=getFirestore(app);
  if(!preflight){
   const schools=await db.collection('schools').limit(31).get();
   const issues={};let invalid=0;
   for(const doc of schools.docs.slice(0,30)){
    const reasons=schoolRegistryIssues(doc.id,doc.data());
    if(reasons.length)invalid++;
    for(const reason of reasons)issues[reason]=(issues[reason]??0)+1;
   }
   console.log('School registry diagnostics (up to 30): checked '+Math.min(30,schools.size)+', needs review '+invalid);
   for(const [reason,count] of Object.entries(issues))console.log('Registry issue: '+reason+' — '+count);
   // Inspect only the first malformed registry entry. Never log its identity or
   // copy any academic record; a document-path migration requires separate review.
   const legacy=schools.docs.slice(0,30).find(doc=>schoolRegistryIssues(doc.id,doc.data()).length);
   if(legacy){
    const data=legacy.data();
    const raw=data.iemisCode;
    const candidate=typeof raw==='string'?raw.trim():Number.isSafeInteger(raw)&&raw>=0?String(raw):'';
    const valid=/^[0-9]{5,20}$/.test(candidate);
    console.log('Legacy school has usable numeric IEMIS field: '+(valid?'YES':'NO'));
    if(valid){
     const target=await db.collection('schools').doc(candidate).get();
     console.log('Proposed canonical school document already exists: '+(target.exists?'YES':'NO'));
    }
    const sub=await legacy.ref.listCollections();
    console.log('Legacy school immediate subcollections: '+sub.length);
    const known=new Set(['members','students','staff','teachers','subjects','attendance','exams','marks','component_marks','mark_settings','school_settings','teacher_assignments','class_mark_drafts','official_marks_pointers']);
    for(const collection of sub.slice(0,20)){
     const count=(await collection.count().get()).data().count;
     console.log('Legacy collection '+(known.has(collection.id)?collection.id:'[other]')+' direct documents: '+count);
    }
    if(sub.length>20)console.log('Additional subcollections not inspected; migration must remain blocked');
    console.log('Legacy school path unchanged; no data moved or modified.');
   }
  }
  const snap=await db.collection('v47_super_admins').where('active','==',true).limit(20).get();
  console.log('Active root Super Admin documents (bounded at 20): '+snap.size);
  if(!snap.size)blocked=true;
  try{
   const users=await getAuth(app).getUsers(snap.docs.map(d=>({uid:d.id})));
   console.log('Matching enabled Auth accounts: '+users.users.filter(u=>!u.disabled).length);
   if(users.users.filter(u=>!u.disabled).length!==snap.size)blocked=true;
   if(!preflight){
    // Diagnose the recent reported sign-in without logging any email or UID.
    // Only inspect a small account set; never infer or grant privilege from login time.
    const page=await getAuth(app).listUsers(20);
    if(page.pageToken)console.log('Recent-account comparison skipped: more than 20 Auth accounts');
    else{
     const enabled=page.users.filter(u=>!u.disabled);
     const recent=enabled.map(u=>({u,time:Date.parse(u.metadata.lastSignInTime??'')})).filter(x=>Number.isFinite(x.time)).sort((a,b)=>b.time-a.time);
     console.log('Enabled Auth accounts in bounded comparison: '+enabled.length);
     if(recent.length===0||recent.length>1&&recent[0].time===recent[1].time)console.log('Most recent sign-in account cannot be determined uniquely');
     else{
      const match=snap.docs.some(d=>d.id===recent[0].u.uid);
      console.log('Most recently signed-in account has active root Super Admin document: '+(match?'YES':'NO'));
      console.log('Most recent sign-in age in whole minutes: '+Math.max(0,Math.floor((Date.now()-recent[0].time)/60000)));
      if(!match)blocked=true;
     }
    }
   }
  }catch(e){console.log('Auth UID match check unavailable: '+summarizeError(e));blocked=true}
 }catch(e){console.log('Registry metadata read unavailable: '+summarizeError(e));blocked=true}
}finally{await deleteApp(app)}
if(blocked)process.exitCode=1;
