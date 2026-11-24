// One-time operator-authorized V47 root registry repair. No client role bypass.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const projectId='smss-exam-portal-v47';
const requireAdmin=createRequire(new URL('../../v47-runtime/package.json',import.meta.url));
const {initializeApp,cert,deleteApp}=requireAdmin('firebase-admin/app');
const {getAuth}=requireAdmin('firebase-admin/auth');
const {getFirestore}=requireAdmin('firebase-admin/firestore');
// Exact operator-selected account fingerprint; no email/UID in repository logs.
// Do not use recent sign-in time to choose the account.
const expected='a27120a667e0ab25f85bae305b2ce35ee6b847b2acc3db803bcefc1d8de633a7';
const fingerprint=email=>createHash('sha256').update('SMSS-V47-owner-authorized-2026-11-24:'+email.trim().toLowerCase()).digest('hex');
if(process.env.GITHUB_REF!=='refs/heads/smss-v47-multischool-work'||process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Isolated V47 operator run required');
const key=JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
if(key.type!=='service_account'||key.project_id!==projectId)throw Error('Dedicated V47 credential required');
const app=initializeApp({credential:cert(key),projectId},'v47-owner-admin-repair');
try{
 const auth=getAuth(app),db=getFirestore(app),accounts=await auth.listUsers(20);
 if(accounts.pageToken||accounts.users.length!==2)throw Error('Account set differs from reviewed two-account diagnostic; no change');
 const candidates=accounts.users.filter(u=>typeof u.email==='string'&&fingerprint(u.email)===expected);
 if(candidates.length!==1||candidates[0].disabled||!candidates[0].providerData.some(p=>p.providerId==='password'))throw Error('Exact requested enabled password account not found; no change');
 const uid=candidates[0].uid;
 const registry=db.collection('v47_super_admins'),target=registry.doc(uid);
 const active=await registry.where('active','==',true).limit(3).get();
 if(![1,2].includes(active.size))throw Error('Unexpected root registry; no change');
 const existing=await auth.getUsers(active.docs.map(d=>({uid:d.id})));
 if(existing.users.filter(u=>!u.disabled).length!==active.size)throw Error('Existing root accounts differ from reviewed diagnostic; no change');
 const previous=active.docs.map(d=>d.id).sort().join('|');
 const outcome=await db.runTransaction(async tx=>{
  const roots=await tx.get(registry.where('active','==',true).limit(3));
  const doc=await tx.get(target);
  if(roots.docs.map(d=>d.id).sort().join('|')!==previous)throw Error('Registry changed; no write');
  if(doc.exists){
   if(doc.data().active===true)return 'Already active';
   throw Error('Existing inactive or unexpected target registry document; refuse to overwrite');
  }
  if(roots.size!==1)throw Error('Expected exactly one existing active root; no write');
  tx.create(target,{active:true});
  return 'Created exact requested root membership';
 });
 const verified=await target.get();
 if(!verified.exists||verified.data().active!==true)throw Error('Target membership verification failed');
 const after=await registry.where('active','==',true).limit(3).get();
 if(after.size!==2||!active.docs.every(d=>after.docs.some(x=>x.id===d.id)))throw Error('Unexpected root registry after repair; inspect before retry');
 console.log(outcome);
 console.log('Exact requested V47 Auth account has active Super Admin membership: YES');
 console.log('Previously active root memberships preserved: YES');
 console.log('No account, password, school record, rules, billing or V46 change.');
}catch(e){
 // Only sanitized status, never SDK messages that could expose identifiers.
 console.error('Repair stopped or verification incomplete; inspect exact state before retry. Code: '+String(e?.code??'guard-or-verification').replace(/[^a-zA-Z0-9_/-]/g,''));
 process.exitCode=1;
}finally{await deleteApp(app)}
