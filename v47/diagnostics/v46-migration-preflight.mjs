// V46/V47 bounded migration inventory. No database or account mutations.
// Keep all record names, account identifiers and credential material out of logs.
import {createRequire} from 'node:module';
import {summarizeCollectionCounts,inspectSubjectNames,compareAuthIdentities} from './v46-migration-preflight-core.mjs';
const requireAdmin=createRequire(new URL('../../v47-runtime/package.json',import.meta.url));
const {initializeApp,cert,deleteApp}=requireAdmin('firebase-admin/app');
const {getFirestore}=requireAdmin('firebase-admin/firestore');
const {getAuth}=requireAdmin('firebase-admin/auth');
const sourceProject='exam-portal-smss-95016',targetProject='smss-exam-portal-v47';
const sid=process.env.V47_MIGRATION_IEMIS;
const safeError=e=>String(e?.code??e?.status??e?.name??'unknown').replace(/[^A-Za-z0-9_/-]/g,'').slice(0,60);
function key(name,project){
 const raw=process.env[name];delete process.env[name];
 if(!raw)throw Error('Missing dedicated project credential');
 const value=JSON.parse(raw);
 if(value.project_id!==project||value.type!=='service_account')throw Error('Unexpected credential project');
 return value;
}
async function counts(collections){
 if(collections.length>100)throw Error('Collection inventory exceeds bounded review');
 const out=Object.create(null);
 for(const c of collections){
  const result=await c.count().get();out[c.id]=result.data().count;
 }
 return out;
}
async function identify(label,fn){
 try{return await fn()}catch(e){console.log(label+' unavailable: '+safeError(e));throw e}
}
async function users(auth){
 const out=[];let token;
 do{
  const page=await auth.listUsers(1000,token);
  out.push(...page.users);token=page.pageToken;
  if(out.length>3000||token&&out.length>=3000)throw Error('Auth inventory exceeds bounded review');
 }while(token);
 return out;
}
let source,target;
let blocked=false;
try{
 if(process.env.GITHUB_REF!=='refs/heads/smss-v47-multischool-work'||process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST||!/^\d{5,20}$/.test(sid??''))throw Error('Dedicated migration branch and numeric school ID required');
 source=initializeApp({projectId:sourceProject,credential:cert(key('V46_READ_CREDENTIAL',sourceProject))},'migration-source-read');
 target=initializeApp({projectId:targetProject,credential:cert(key('V47_READ_CREDENTIAL',targetProject))},'migration-target-read');
 const sdb=getFirestore(source),tdb=getFirestore(target);
 try{
  const school=tdb.collection('schools').doc(sid);
  const [sourceCollections,targetSchool,targetCollections]=await Promise.all([identify('V46 source Firestore collection listing',()=>sdb.listCollections()),identify('V47 target school registry',()=>school.get()),identify('V47 target school collection listing',()=>school.listCollections())]);
  const [sc,tc]=await Promise.all([identify('V46 source Firestore counts',()=>counts(sourceCollections)),identify('V47 target Firestore counts',()=>counts(targetCollections))]);
  const summary=summarizeCollectionCounts(sc,tc);
  console.log('V46 top-level Firestore documents: '+summary.sourceTotal);
  console.log('V47 canonical school registry exists: '+(targetSchool.exists?'YES':'NO'));
  console.log('V47 existing direct school-subcollection documents: '+summary.targetExistingDocuments);
  for(const row of summary.rows)console.log(row.name+': source '+row.source+'; target '+row.target);
  console.log('Additional unmapped V46 collections: '+summary.unknownCollections+'; direct documents: '+summary.unknownDocuments);
  if(summary.unknownCollections||targetSchool.exists||summary.targetExistingDocuments)blocked=true;
  // A direct count is not a recursive, consistent-time backup. Never infer completeness.
  console.log('Nested subcollections, reference values, missing parents and Storage require separate complete encrypted local inventory.');
  if(sc.subjects>2000)throw Error('Subject inventory exceeds bounded review');
  if(sc.subjects){
   const q=await sdb.collection('subjects').limit(2001).get();
   if(q.size!==sc.subjects)throw Error('Subject inventory changed during inspection');
   const info=inspectSubjectNames(q.docs.map(d=>({id:d.id,data:d.data()})));
   console.log('Subject name inventory: '+JSON.stringify(info));
   if(info.missing||info.needsClassReview||info.nonCanonicalId)blocked=true;
   console.log('Nepali subject text is preserved as Unicode; this check does not translate or alter names.');
  }
 }catch(e){blocked=true;console.log('Firestore inventory unavailable or incomplete: '+safeError(e))}
 try{
  const [su,tu]=await Promise.all([identify('V46 source Auth account listing',()=>users(getAuth(source))),identify('V47 target Auth account listing',()=>users(getAuth(target)))]);
  const info=compareAuthIdentities(su,tu);
  console.log('Auth aggregate identity and password-hash availability: '+JSON.stringify(info));
  if(info.identityConflicts||info.exactIdentityMatches||info.passwordHashAvailable!==info.passwordAccounts)blocked=true;
  console.log('Password continuity requires authorized local Firebase Auth export/import with original hash parameters; no hashes or account details printed or stored.');
 }catch(e){blocked=true;console.log('Auth inventory unavailable or incomplete: '+safeError(e))}
 console.log('Migration preflight: '+(blocked?'REVIEW REQUIRED':'bounded checks passed')+'; COPY NOT PERFORMED, backup and exact schema verification remain required');
 if(blocked)process.exitCode=1;
}catch(e){console.log('Migration preflight stopped: '+safeError(e));process.exitCode=1}
finally{if(source)await deleteApp(source);if(target)await deleteApp(target)}
