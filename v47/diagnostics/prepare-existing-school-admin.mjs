// Owner-operated V47 membership repair, no Auth mutation or root-role removal.
// The operator explicitly supplies the two email identities. Never log them.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const projectId='smss-exam-portal-v47';
const sid='300160003';
export async function ensureExistingSchoolAdmin({auth,db,rootEmail,adminEmail,apply=false}){
 const normalized=v=>typeof v==='string'?v.trim().toLowerCase():'';
 if(!normalized(rootEmail)||!normalized(adminEmail)||normalized(rootEmail)===normalized(adminEmail))throw Error('Two distinct existing email accounts required');
 const [root,admin]=await Promise.all([auth.getUserByEmail(normalized(rootEmail)),auth.getUserByEmail(normalized(adminEmail))]);
 if(root.disabled||admin.disabled||root.uid===admin.uid||normalized(root.email)!==normalized(rootEmail)||normalized(admin.email)!==normalized(adminEmail))throw Error('Enabled distinct Auth identities required');
 const school=db.doc('schools/'+sid),rootRole=db.doc('v47_super_admins/'+root.uid),adminRole=db.doc('v47_super_admins/'+admin.uid),member=db.doc('schools/'+sid+'/members/'+admin.uid);
 const expected={uid:admin.uid,schoolId:sid,role:'school_admin',active:true};
 return db.runTransaction(async tx=>{
  const [s,r,a,m]=await Promise.all([tx.get(school),tx.get(rootRole),tx.get(adminRole),tx.get(member)]);
  if(!s.exists||s.data().id!==sid||s.data().active!==true)throw Error('Expected active canonical school missing');
  if(!r.exists||r.data().active!==true||!a.exists||a.data().active!==true)throw Error('Both current Super Admin identities must be verified');
  if(m.exists){
   const d=m.data();
   if(d.uid!==admin.uid||d.schoolId!==sid||d.role!=='school_admin'||typeof d.active!=='boolean')throw Error('Conflicting membership; no overwrite');
   if(d.active===true)return 'ALREADY_ACTIVE';
   if(apply)tx.update(member,{active:true});
   return apply?'ACTIVATED':'WOULD_ACTIVATE';
  }
  if(apply)tx.create(member,expected);
  return apply?'CREATED':'WOULD_CREATE';
 });
}
async function selfTest(){
 const assert=(await import('node:assert/strict')).default;
 const root={uid:'root123',email:'root@example.test'},admin={uid:'admin123',email:'admin@example.test'};
 const auth={getUserByEmail:async email=>email===root.email?root:admin};
 const base='schools/'+sid,mp=base+'/members/'+admin.uid;
 const data=new Map([[base,{id:sid,active:true}],['v47_super_admins/'+root.uid,{active:true}],['v47_super_admins/'+admin.uid,{active:true}]]);
 const writes=[];
 const db={doc:x=>x,runTransaction:async fn=>fn({get:async p=>({exists:data.has(p),data:()=>data.get(p)}),create:(p,d)=>{writes.push(p);data.set(p,d)},update:(p,d)=>{writes.push(p);data.set(p,{...data.get(p),...d})}})};
 const args={auth,db,rootEmail:root.email,adminEmail:admin.email};
 assert.equal(await ensureExistingSchoolAdmin(args),'WOULD_CREATE');assert.equal(writes.length,0);
 assert.equal(await ensureExistingSchoolAdmin({...args,apply:true}),'CREATED');
 assert.deepEqual(writes,[mp]);
 assert.equal(await ensureExistingSchoolAdmin({...args,apply:true}),'ALREADY_ACTIVE');
 data.set(mp,{...data.get(mp),active:false,extra:'keep'});
 assert.equal(await ensureExistingSchoolAdmin({...args,apply:true}),'ACTIVATED');assert.equal(data.get(mp).extra,'keep');
 data.set(mp,{...data.get(mp),role:'teacher'});
 await assert.rejects(ensureExistingSchoolAdmin({...args,apply:true}),/Conflicting/);
 assert.equal(writes.length,2);
 data.delete('v47_super_admins/'+root.uid);
 await assert.rejects(ensureExistingSchoolAdmin({...args,apply:true}),/Super Admin/);
 console.log('PASS create/activate only exact membership, conflicts refused, root privileges unchanged');
}
async function main(){
 if(process.argv[2]==='--self-test'){await selfTest();return}
 const mode=process.argv[2];
 const local=mode==='--local-review'||mode==='--local-apply';
 const apply=mode==='--apply'||mode==='--local-apply';
 if(!['--review','--apply','--local-review','--local-apply'].includes(mode))throw Error('Explicit review or apply required');
 if(local&&(process.env.CI||process.env.GITHUB_ACTIONS))throw Error('Local operator mode forbidden in CI');
 if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Unexpected emulator environment');
 const requireAdmin=createRequire(new URL('../../v47-runtime/package.json',import.meta.url));
 const {initializeApp,cert,applicationDefault,deleteApp}=requireAdmin('firebase-admin/app');
 const {getAuth}=requireAdmin('firebase-admin/auth');const {getFirestore}=requireAdmin('firebase-admin/firestore');
 let credential;
 if(local){
  if(process.env.V47_CONFIRM_PROJECT!==projectId)throw Error('Explicit V47 project confirmation required');
  credential=applicationDefault();
 }else{
  const key=JSON.parse(process.env.V47_SERVICE_ACCOUNT??'null');
  if(key?.type!=='service_account'||key.project_id!==projectId)throw Error('Dedicated V47 credential required');
  credential=cert(key);
 }
 const app=initializeApp({credential,projectId},'v47-existing-admin-membership');
 try{
  const args={auth:getAuth(app),db:getFirestore(app),rootEmail:process.env.V47_ROOT_EMAIL,adminEmail:process.env.V47_SCHOOL_ADMIN_EMAIL};
  const result=await ensureExistingSchoolAdmin({...args,apply});
  console.log('SCHOOL ADMIN MEMBERSHIP:',result);
  if(apply&&await ensureExistingSchoolAdmin(args)!=='ALREADY_ACTIVE')throw Error('Post-write verification incomplete; review before retrying');
  console.log('V46 WRITES: ZERO; AUTH CHANGES: ZERO; SUPER ADMIN CHANGES: ZERO; ACADEMIC DATA CHANGES: ZERO');
 }finally{await deleteApp(app)}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error('Membership operation stopped:',String(e.code??'validation').replace(/[^a-zA-Z0-9_/-]/g,''));process.exitCode=1});
