// Authorized Cloud Shell operator only. GET requests to the target school;
// no Firebase Admin write API, source reads, Auth export or credential logs.
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {auditAllTermSettingsCoverage} from '../entry-settings-coverage.mjs';
const project='smss-exam-portal-v47',terms=['1st','2nd','3rd','final'];
const classes=Array.from({length:10},(_,i)=>String(i+1));
const requireScope=sid=>{if(typeof sid!=='string'||!/^\d{5,20}$/.test(sid))throw Error('Invalid school ID')};
function decode(v){
 if(!v||typeof v!=='object'||Object.keys(v).length!==1)throw Error('Invalid Firestore value');
 if('stringValue'in v)return v.stringValue;
 if('booleanValue'in v)return v.booleanValue;
 if('integerValue'in v){const n=Number(v.integerValue);if(!Number.isSafeInteger(n))throw Error('Invalid integer');return n}
 if('doubleValue'in v){if(typeof v.doubleValue!=='number'||!Number.isFinite(v.doubleValue))throw Error('Invalid number');return v.doubleValue}
 if('nullValue'in v)return null;
 if('arrayValue'in v)return (v.arrayValue.values??[]).map(decode);
 if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields??{}).map(([k,x])=>[k,decode(x)]));
 throw Error('Unsupported masked field type');
}
export function decodeScopedDocument(doc,prefix){
 if(typeof doc?.name!=='string'||!doc.name.startsWith(prefix)||!doc.name.slice(prefix.length)||doc.name.slice(prefix.length).includes('/'))throw Error('Unexpected target document path');
 const fields=Object.fromEntries(Object.entries(doc.fields??{}).map(([k,v])=>[k,decode(v)]));
 const id=doc.name.slice(prefix.length);
 return {id,fields};
}
export function summarizeStagedSettings({schoolId,school,subjects,settings,members,assignments}){
 requireScope(schoolId);
 if(school?.id!==schoolId||typeof school.active!=='boolean')throw Error('Target registry identity mismatch');
 const check=(rows,cap)=>{if(!Array.isArray(rows)||rows.length>cap||new Set(rows.map(r=>r.id)).size!==rows.length||rows.some(r=>r.fields?.schoolId!==schoolId))throw Error('Incomplete or foreign staged inventory')};
 check(subjects,1000);check(settings,4000);check(members,300);check(assignments,1000);
 const subjectsById=new Map(subjects.map(r=>[r.id,r.fields])),membersById=new Map(members.map(r=>[r.id,r.fields]));
 const activeSubjects=subjects.filter(r=>r.fields.active===true&&classes.includes(r.fields.class));
 const recognized=settings.filter(r=>classes.includes(r.fields.classId)&&terms.includes(r.fields.examId)&&typeof r.fields.subjectId==='string');
 const idMismatch=recognized.filter(r=>r.fields.id!==r.id).length;
 const reports=classes.map(classId=>auditAllTermSettingsCoverage({schoolId,classId,subjects:activeSubjects.filter(r=>r.fields.class===classId).map(r=>({id:r.id,name:r.fields.name,active:true})),settings:recognized.filter(r=>r.fields.classId===classId&&r.fields.id===r.id).map(r=>r.fields)}));
 const matrix=reports.flatMap(r=>r.reports.map(t=>({classId:r.classId,term:t.examId,matched:t.matched,reviewRequired:t.reviewRequired,statusCounts:Object.fromEntries([...new Set(t.rows.map(x=>x.status))].sort().map(s=>[s,t.rows.filter(x=>x.status===s).length]))})));
 const badMembers=members.filter(r=>r.fields.uid!==r.id||!['school_admin','teacher','viewer'].includes(r.fields.role)||typeof r.fields.active!=='boolean').length;
 const badAssignments=assignments.filter(r=>{const a=r.fields,m=membersById.get(a.uid),s=subjectsById.get(a.subjectId);return typeof a.active!=='boolean'||r.id!==[schoolId,a.uid,a.classId,a.subjectId].join(':')||!m||m.role!=='teacher'||m.uid!==a.uid||!s||s.class!==a.classId||a.active===true&&(m.active!==true||s.active!==true)}).length;
 return {schoolActive:school.active,activeClassSubjects:activeSubjects.length,totalSettings:settings.length,recognizedEntrySettings:recognized.length,settingsIdentityMismatches:idMismatch,otherOrLegacySettings:settings.length-recognized.length,matchedClassTermSubjects:matrix.reduce((n,r)=>n+r.matched,0),reviewClassTermSubjects:matrix.reduce((n,r)=>n+r.reviewRequired,0),members:members.length,activeAdmins:members.filter(r=>r.fields.role==='school_admin'&&r.fields.active===true&&r.fields.uid===r.id).length,invalidMemberRecords:badMembers,teacherAssignments:assignments.length,invalidAssignmentRecords:badAssignments,matrix,writeAuthorized:false,liveIemisVerified:false,activationAuthorized:false};
}
// Only the previously configured V47 service-account secret is accepted in CI.
// This does not request extra IAM grants, nor expose tokens or raw fields.
export function validateTargetCredential(value){
 if(value?.type!=='service_account'||value.project_id!==project||typeof value.client_email!=='string'||typeof value.private_key!=='string')throw Error('Unexpected target credential');
 return value;
}
async function operatorToken(){
 const raw=process.env.V47_TARGET_AUDIT_CREDENTIAL;
 delete process.env.V47_TARGET_AUDIT_CREDENTIAL;
 if(process.env.GITHUB_ACTIONS==='true'){
  if(process.env.GITHUB_REF!=='refs/heads/smss-v47-multischool-work'||!raw)throw Error('Dedicated V47 audit branch and credential required');
  const requireAdmin=createRequire(new URL('../../v47-runtime/package.json',import.meta.url));
  const {cert}=requireAdmin('firebase-admin/app');
  return (await cert(validateTargetCredential(JSON.parse(raw))).getAccessToken()).access_token;
 }
 if(raw)throw Error('Use gcloud operator authentication outside CI');
 return execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:30000}).trim();
}
async function main(){
 const sid=process.argv[2];requireScope(sid);
 if(process.argv.length!==3||process.env.FIRESTORE_EMULATOR_HOST)throw Error('Specify one target school ID');
 // The token remains in this process; never print it or put it in URLs.
 const token=await operatorToken();
 if(typeof token!=='string'||!token||/\s/.test(token))throw Error('Operator authentication unavailable');
 const base='https://firestore.googleapis.com/v1/projects/'+project+'/databases/(default)/documents/';
 const prefix='projects/'+project+'/databases/(default)/documents/schools/'+sid;
 const get=async(path,params)=>{
  const u=new URL(base+path);for(const [k,v] of params??[])u.searchParams.append(k,v);
  const res=await fetch(u,{method:'GET',headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!res.ok)throw Error('Target read failed: HTTP '+res.status);
  return res.json();
 };
 const registry=async()=>{const d=await get('schools/'+sid,[['mask.fieldPaths','id'],['mask.fieldPaths','active']]);if(d.name!==prefix)throw Error('Target registry path mismatch');return {fields:decodeScopedDocument(d,prefix.slice(0,-sid.length)).fields,updateTime:d.updateTime}};
 const before=await registry();
 console.log('V47 target registry read: OK; school active: '+String(before.fields.active));
 const list=async(name,fields,cap)=>{
  const out=[],tokens=new Set();let next;
  do{
   const params=[['pageSize','200'],...fields.map(f=>['mask.fieldPaths',f])];if(next)params.push(['pageToken',next]);
   const r=await get('schools/'+sid+'/'+name,params);
   out.push(...(r.documents??[]).map(d=>decodeScopedDocument(d,prefix+'/'+name+'/')));
   if(out.length>cap)throw Error('Target inventory exceeds cap');
   next=r.nextPageToken;if(next){if(tokens.has(next))throw Error('Repeated page token');tokens.add(next)}
  }while(next);
  return out;
 };
 const subjects=await list('subjects',['schoolId','class','name','active'],1000);
 console.log('Target subject inventory read: OK; '+subjects.length+' documents');
 const settings=await list('mark_settings',['schoolId','id','classId','subjectId','examId','active','components'],4000);
 console.log('Target settings inventory read: OK; '+settings.length+' documents');
 const members=await list('members',['schoolId','uid','role','active'],300);
 console.log('Target member inventory read: OK; '+members.length+' documents');
 const assignments=await list('teacher_assignments',['schoolId','uid','classId','subjectId','active'],1000);
 console.log('Target assignment inventory read: OK; '+assignments.length+' documents');
 const after=await registry();
 if(before.updateTime!==after.updateTime||JSON.stringify(before.fields)!==JSON.stringify(after.fields))throw Error('Registry changed during audit');
 const result=summarizeStagedSettings({schoolId:sid,school:after.fields,subjects,settings,members,assignments});
 console.log(JSON.stringify(result,null,2));
 console.log('TARGET READ ONLY; FIREBASE WRITES: ZERO; NOT A CONSISTENT SNAPSHOT OR RELEASE APPROVAL');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error('Audit stopped: '+(e.message.startsWith('Target read failed: HTTP ')?e.message:'Invalid scope, incomplete inventory or unavailable operator access'));process.exitCode=1});
