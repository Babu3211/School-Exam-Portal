// Authorized Cloud Shell operator only. GET requests to the target school;
// no Firebase Admin write API, source reads, Auth export or credential logs.
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {excelWorkbook} from '../excel-workbook.mjs';
import {auditAllTermSettingsCoverage,auditEntrySettingsCoverage} from '../entry-settings-coverage.mjs';
import {prepareNewSubjectExamSettings} from '../create-subject-exam-settings.mjs';
import {previewV46MarkSettingsMigration,isLegacyPrimaryAchievement} from '../preview-v46-mark-settings-migration.mjs';
import {previewV46PrimaryAchievementSettings} from '../preview-v46-primary-achievement-settings.mjs';
import {iemisSubjectKey} from '../iemis-ledger.js';
import {primarySubjectKey} from '../primary-assessment-teacher-worksheet.mjs';
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
const groups={'1-3':['1','2','3'],'4-5':['4','5'],'6-8':['6','7','8'],'9-10':['9','10']};
const norm=v=>typeof v==='string'?v.normalize('NFC').trim().toLocaleLowerCase('en'):'';
const classValue=v=>(typeof v==='string'||typeof v==='number'?String(v):'').trim().replace(/[०-९]/g,d=>String('०१२३४५६७८९'.indexOf(d))).match(/^(?:(?:class|कक्षा)\s*)?([1-9]|10)$/i)?.[1];
const termAliases=new Map(Object.entries({'1st':'1st','first':'1st','2nd':'2nd','second':'2nd','3rd':'3rd','third':'3rd','final':'final','annual':'final'}));
const termValue=v=>termAliases.get(norm(v));
const present=v=>v!==undefined&&v!==null&&v!=='';
const countBy=(rows,key)=>Object.fromEntries([...new Set(rows.map(key))].sort().map(k=>[k,rows.filter(r=>key(r)===k).length]));
// Count possible exact-name/class mappings, never assume a term or fan out a
// group setting to all exams. All raw labels, IDs, and scores stay in memory.
// Use existing V46/V47 subject aliases for candidate discovery only.
// Never replace a subject ID, assign a teacher or choose an exam from aliases.
const candidateKey=(label,grade)=>{
 if(typeof label!=='string'||!label.trim())return null;
 return Number(grade)<=5?primarySubjectKey(label)??iemisSubjectKey(label):iemisSubjectKey(label);
};
function legacyCandidateRows({schoolId,subjects,settings}){
 const rows=[];
 for(const {id,fields:d} of settings){
  const group=typeof d.classGroup==='string'&&Object.hasOwn(groups,d.classGroup)?groups[d.classGroup]:null,specific=classValue(d.className);
  let kind='Unsupported scope',validComponents=0,candidates=[];
  if(group&&(!present(d.className)||specific&&group.includes(specific))&&typeof d.subject==='string'&&d.subject.trim()){
   const scope=specific?[specific]:group;
   const eligible=subjects.filter(r=>r.fields.active===true&&scope.includes(r.fields.class));
   const exact=eligible.filter(r=>norm(r.fields.name)===norm(d.subject));
   const aliases=eligible.filter(r=>candidateKey(r.fields.name,r.fields.class)&&candidateKey(r.fields.name,r.fields.class)===candidateKey(d.subject,r.fields.class));
   // Exact name is not sufficient when another alias in the same class could conflict.
   candidates=exact.length?[...new Map([...exact,...aliases].map(r=>[r.id,r])).values()]:aliases;
   if(!candidates.length)kind='No existing alias candidate';
   else if(new Set(candidates.map(r=>r.fields.class)).size!==candidates.length)kind='Ambiguous within class';
   else if(!specific&&candidates.length>1)kind='Group expansion review required';
   else{
    kind=exact.length?'Unique exact name/class candidate':'Unique existing alias candidate';
    for(const r of candidates)try{
     // The preview validator takes a term; a fixed validation-only sentinel
     // checks legacy components without declaring an actual term or producing a write.
     const args={schoolId,classId:r.fields.class,subjectId:r.id,examId:'1st',verifiedSubjectName:r.fields.name,legacy:{...d,subject:r.fields.name,...(specific?{className:specific}:{})}};
     (Number(r.fields.class)<=5&&isLegacyPrimaryAchievement(args.legacy)?previewV46PrimaryAchievementSettings:previewV46MarkSettingsMigration)(args);
     validComponents++;
    }catch{}
   }
  }
  rows.push({id,legacy:d,kind,validComponents,candidates,bucket:specific??'group or unknown'});
 }
 return rows;
}
export function summarizeLegacySubjectCandidates(args){
 const counts=legacyCandidateRows(args),classCounts={};
 const targetCounts=new Map();
 for(const {kind,validComponents,candidates,bucket} of counts){
  if(kind.startsWith('Unique ')&&validComponents===1&&candidates.length===1){
   const target=candidates[0].id;
   targetCounts.set(target,(targetCounts.get(target)??0)+1);
  }
  classCounts[bucket]??={records:0,uniqueCandidates:0,componentShapeValid:0};
  classCounts[bucket].records++;
  if(kind.startsWith('Unique '))classCounts[bucket].uniqueCandidates++;
  classCounts[bucket].componentShapeValid+=validComponents;
 }
 return {records:counts.length,classification:countBy(counts,r=>r.kind),componentShapeValid:counts.reduce((n,r)=>n+r.validComponents,0),distinctValidatedTargetSubjects:targetCounts.size,conflictingTargetSubjects:[...targetCounts.values()].filter(n=>n>1).length,byClass:classCounts,termAssigned:false,writeAuthorized:false};
}
// Preview a term-specific canonical settings shape without authorizing that
// term. The original source components/maxima are preserved; the primary
// derived Full Marks column is omitted only in the candidate schema.
function termCompatibility(row,schoolId,examId){
 const target=row.candidates[0],classId=target.fields.class,subjectId=target.id;
 const legacy={...row.legacy,subject:target.fields.name,...(row.bucket!=='group or unknown'?{className:row.bucket}:{})};
 const args={legacy,schoolId,classId,subjectId,examId,verifiedSubjectName:target.fields.name};
 try{
  let components;
  if(Number(classId)<=5&&isLegacyPrimaryAchievement(legacy)){
   const p=previewV46PrimaryAchievementSettings(args);
   components=[{key:'count',name:'No. of Learning Achievement',fullMarks:p.learningAchievementCount},{key:'obtained',name:'Obtained Learning Achievement',fullMarks:p.obtainedAchievementMaximum}];
  }else{
   components=previewV46MarkSettingsMigration(args).settings.components;
  }
  const settings=prepareNewSubjectExamSettings({schoolId,classId,subjectId,examId,components});
  const audit=auditEntrySettingsCoverage({schoolId,classId,examId,subjects:[{id:subjectId,name:target.fields.name,active:true}],settings:[settings]});
  return audit.rows[0].status==='Schema match'?'Schema compatible':audit.rows[0].status==='Configured settings valid'?'Configured settings valid':'Invalid candidate settings';
 }catch{return 'Invalid candidate settings'}
}
export function summarizeTermCompatibility({schoolId,subjects,settings}){
 const rows=legacyCandidateRows({schoolId,subjects,settings});
 const byTarget=new Map();
 for(const row of rows)if(row.kind.startsWith('Unique ')&&row.validComponents===1&&row.candidates.length===1){
  const id=row.candidates[0].id,group=byTarget.get(id)??[];group.push(row);byTarget.set(id,group);
 }
 // A collision is not resolved by picking the first or last record.
 const unique=[...byTarget.values()].filter(g=>g.length===1).map(g=>g[0]);
 const details=unique.map(row=>({row,statuses:Object.fromEntries(terms.map(t=>[t,termCompatibility(row,schoolId,t)]))}));
 const byTerm=Object.fromEntries(terms.map(t=>[t,countBy(details,r=>r.statuses[t])]));
 return {distinctSingleSourceSubjects:unique.length,conflictingTargets:[...byTarget.values()].filter(g=>g.length>1).length,byTerm,
  noCompatibleTerm:details.filter(r=>terms.every(t=>!['Schema compatible','Configured settings valid'].includes(r.statuses[t]))).length,
  termAssigned:false,writeAuthorized:false,iemisVerified:false};
}
// Review every registered subject, including group-only sources and overlaps.
// Never choose a group setting over a class-specific setting (or vice versa)
// without independently verified precedence. No term assignment or writes.
export function summarizeRegisteredSubjectCoverage({schoolId,subjects,settings}){
 const rows=legacyCandidateRows({schoolId,subjects,settings});
 const active=subjects.filter(r=>r.fields.active===true&&classes.includes(r.fields.class));
 const byId=new Map(active.map(r=>[r.id,[]]));
 for(const row of rows)for(const candidate of row.candidates)if(byId.has(candidate.id))byId.get(candidate.id).push({row,candidate});
 const coverage=active.map(candidate=>{
  const sources=byId.get(candidate.id),classId=candidate.fields.class;
  let status='No candidate source';
  if(sources.length>1)status='Overlapping source records';
  else if(sources.length===1){
   const {row}=sources[0];
   if(row.kind==='Ambiguous within class')status='Ambiguous subject identity';
   else{
    const isolated={...row,candidates:[candidate]};
    const valid=termCompatibility(isolated,schoolId,'1st');
    status=valid==='Invalid candidate settings'?'Invalid source components':row.bucket==='group or unknown'?'Group source review required':'Single class source valid';
   }
  }
  return {classId,status};
 });
 return {registeredSubjects:active.length,classification:countBy(coverage,r=>r.status),
  byClass:classes.map(classId=>({classId,counts:countBy(coverage.filter(r=>r.classId===classId),r=>r.status)})),
  termAssigned:false,writeAuthorized:false};
}
function orphanAssignmentCandidates({subjects,assignments}){
 const ids=new Set(subjects.map(r=>r.id));
 return assignments.filter(r=>!ids.has(r.fields.subjectId)).map(r=>{
  const a=r.fields,labels=[a.subjectName,a.subject].filter(v=>typeof v==='string'&&v.trim());
  const label=labels.length&&new Set(labels.map(norm)).size===1?labels[0]:'';
  const key=label?candidateKey(label,a.classId):null;
  const matches=label?subjects.filter(r=>r.fields.class===a.classId&&r.fields.active===true&&
   (norm(r.fields.name)===norm(label)||!!key&&candidateKey(r.fields.name,a.classId)===key)):[];
  const status=labels.length&&!label?'Conflicting stored labels':!label?'No stored subject label':matches.length===1?'Unique label candidate':matches.length>1?'Ambiguous label candidate':'No matching class subject';
  return {r,label,matches,status};
 });
}
export function summarizeLegacySettings({schoolId,subjects,settings}){
 const results=[];
 for(const row of settings){
  // Do not treat malformed legacy metadata as a mapped setting.
  const d=row.fields,group=typeof d.classGroup==='string'&&Object.hasOwn(groups,d.classGroup)?groups[d.classGroup]:null,specific=classValue(d.className);
  const record={kind:'Unrecognized legacy structure',term:'Unspecified',candidates:0,validPreviews:0};
  const rawTerms=[d.examId,d.term,d.examName].filter(present),mapped=rawTerms.map(termValue);
  if(rawTerms.length)record.term=mapped.every(Boolean)&&new Set(mapped).size===1?mapped[0]:'Unresolved or conflicting';
  if(group&&typeof d.subject==='string'&&d.subject.trim()&&Array.isArray(d.components)){
   if(present(d.className)&&(!specific||!group.includes(specific)))record.kind='Class-specific identity conflict';
   else{
    const scope=specific?[specific]:group;
    const candidates=subjects.filter(r=>r.fields.active===true&&scope.includes(r.fields.class)&&norm(r.fields.name)===norm(d.subject));
    record.candidates=candidates.length;
    if(!candidates.length)record.kind='No exact registered subject';
    else if(new Set(candidates.map(r=>r.fields.class)).size!==candidates.length)record.kind='Ambiguous subject within class';
    else if(!terms.includes(record.term))record.kind='Explicit term review required';
    else if(!specific&&candidates.length>1)record.kind='Class-group expansion review required';
    else{
     record.kind='Invalid legacy components';
     for(const candidate of candidates)try{
      const classId=candidate.fields.class,legacy={...d,...(specific?{className:specific}:{})};
      const args={legacy,schoolId,classId,subjectId:candidate.id,examId:record.term,verifiedSubjectName:candidate.fields.name};
      (Number(classId)<=5&&isLegacyPrimaryAchievement(args.legacy)?previewV46PrimaryAchievementSettings:previewV46MarkSettingsMigration)(args);
      record.validPreviews++;
     }catch{}
     if(record.validPreviews===candidates.length)record.kind='Exact mapping preview only';
    }
   }
  }
  results.push(record);
 }
 return {records:results.length,classification:countBy(results,r=>r.kind),termClassification:countBy(results,r=>r.term),exactNameClassCandidates:results.reduce((n,r)=>n+r.candidates,0),validatedPreviews:results.reduce((n,r)=>n+r.validPreviews,0),writeAuthorized:false};
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
 const assignmentReasons=assignments.map(r=>{const a=r.fields,m=membersById.get(a.uid),s=subjectsById.get(a.subjectId);
  if(typeof a.active!=='boolean')return 'Invalid active flag';
  if(r.id!==[schoolId,a.uid,a.classId,a.subjectId].join(':'))return 'Noncanonical assignment ID';
  if(!m||m.role!=='teacher'||m.uid!==a.uid)return 'Missing or wrong teacher membership';
  if(!s)return 'Missing subject ID';
  if(s.class!==a.classId)return 'Subject registered to different class';
  if(a.active===true&&s.active!==true)return 'Inactive subject';
  if(a.active===true&&m.active!==true)return 'Teacher membership inactive';
  return 'Structurally valid';
 });
 const badAssignments=assignmentReasons.filter(r=>r!=='Structurally valid').length;
 const legacySettings=settings.filter(r=>!recognized.includes(r));
 const legacyMapping=summarizeLegacySettings({schoolId,subjects,settings:legacySettings});
 const legacySubjectCandidates=summarizeLegacySubjectCandidates({schoolId,subjects,settings:legacySettings});
 return {schoolActive:school.active,activeClassSubjects:activeSubjects.length,totalSettings:settings.length,recognizedEntrySettings:recognized.length,settingsIdentityMismatches:idMismatch,otherOrLegacySettings:settings.length-recognized.length,matchedClassTermSubjects:matrix.reduce((n,r)=>n+r.matched,0),reviewClassTermSubjects:matrix.reduce((n,r)=>n+r.reviewRequired,0),members:members.length,activeAdmins:members.filter(r=>r.fields.role==='school_admin'&&r.fields.active===true&&r.fields.uid===r.id).length,invalidMemberRecords:badMembers,teacherAssignments:assignments.length,invalidAssignmentRecords:badAssignments,assignmentReviewReasons:countBy(assignmentReasons,r=>r),legacyMapping,legacySubjectCandidates,registeredSubjectCoverage:summarizeRegisteredSubjectCoverage({schoolId,subjects,settings:legacySettings}),orphanAssignmentReview:countBy(orphanAssignmentCandidates({subjects,assignments}),r=>r.status),termCompatibility:summarizeTermCompatibility({schoolId,subjects,settings:legacySettings}),matrix,writeAuthorized:false,liveIemisVerified:false,activationAuthorized:false};
}
// Optional private operator workbooks. No student records, scores, email,
// passwords, tokens, or raw data dumps; CI never creates these files.
export function buildLocalReviewWorkbooks(inputs){
 const result=summarizeStagedSettings(inputs);
 const {schoolId,subjects,settings,assignments}=inputs;
 const legacy=settings.filter(r=>!(classes.includes(r.fields.classId)&&terms.includes(r.fields.examId)&&typeof r.fields.subjectId==='string'));
 const candidates=legacyCandidateRows({schoolId,subjects,settings:legacy});
 const str=v=>typeof v==='string'?v:'';
 const components=d=>Array.isArray(d.components)?d.components.map(c=>str(c?.name)+' / '+(typeof c?.fullMarks==='number'?c.fullMarks:'?')).join(' | '):'';
 const targetCounts=new Map();
 for(const row of candidates)if(row.kind.startsWith('Unique ')&&row.validComponents===1&&row.candidates.length===1){
  const id=row.candidates[0].id;targetCounts.set(id,(targetCounts.get(id)??0)+1);
 }
 const rows=[];
 for(const r of candidates){
  const d=r.legacy;
  const choices=r.candidates.length?r.candidates:[null];
  const status=Object.fromEntries(terms.map(t=>[t,r.kind.startsWith('Unique ')&&r.validComponents===1&&r.candidates.length===1&&(targetCounts.get(r.candidates[0].id)??0)===1?termCompatibility(r,schoolId,t):'Review required']));
  if(rows.length+choices.length>50000)throw Error('Private review row limit exceeded');
  for(const choice of choices)rows.push([schoolId,r.id,str(d.classGroup),r.bucket,str(d.subject),components(d),r.kind,r.validComponents===1?'Shape valid':'Review required',choice?.fields.class??'',choice?.id??'',choice?.fields.name??'',choice&&(targetCounts.get(choice.id)??0)>1?'Conflicting legacy records':'',...terms.map(t=>status[t]),'', 'Review only; no term or write approved']);
 }
 const settingsBlob=excelWorkbook(['School ID','Legacy settings ID','Class group','Legacy class','Legacy subject','Saved component maxima','Candidate status','Component check','Candidate class','Candidate subject ID','Candidate subject','Target conflict','1st schema','2nd schema','3rd schema','Final schema','Approved term (operator review only)','Notice'],rows,{sheetName:'Legacy mapping review'});
 const assignmentRows=orphanAssignmentCandidates({subjects,assignments}).map(({r,label,matches,status})=>{
  const a=r.fields;
  return [schoolId,r.id,str(a.uid),str(a.classId),str(a.subjectId),label,matches.length,matches.length===1?matches[0].id:'',matches.length===1?matches[0].fields.name:'',status,'Review only — no teacher assignment authorized'];
 });
 const assignmentBlob=excelWorkbook(['School ID','Assignment ID','Teacher UID','Class','Missing subject ID','Stored subject label','Candidate count','Unique candidate ID','Unique candidate name','Review status','Notice'],assignmentRows,{sheetName:'Missing assignment IDs'});
 return {settingsBlob,assignmentBlob,settingsRows:rows.length,assignmentRows:assignmentRows.length,writeAuthorized:result.writeAuthorized};
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
 const localReview=process.argv.length===4&&process.argv[3]==='--local-review';
 if((process.argv.length!==3&&!localReview)||process.env.FIRESTORE_EMULATOR_HOST||localReview&&process.env.GITHUB_ACTIONS==='true')throw Error('Specify one target school ID; private review is local only');
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
 const settings=await list('mark_settings',['schoolId','id','classId','subjectId','examId','active','components','classGroup','className','subject','term','examName','totalFullMarks'],4000);
 console.log('Target settings inventory read: OK; '+settings.length+' documents');
 const members=await list('members',['schoolId','uid','role','active'],300);
 console.log('Target member inventory read: OK; '+members.length+' documents');
 const assignments=await list('teacher_assignments',['schoolId','uid','classId','subjectId','subjectName','subject','active'],1000);
 console.log('Target assignment inventory read: OK; '+assignments.length+' documents');
 console.log('Recheck registry: starting');
 const after=await registry();
 // REST map field ordering is not significant. Compare typed fields, not JSON ordering.
 if(!before.updateTime||!after.updateTime||before.updateTime!==after.updateTime||before.fields.id!==after.fields.id||before.fields.active!==after.fields.active)throw Error('Registry changed during audit');
 console.log('Recheck registry: OK');
 const inputs={schoolId:sid,school:after.fields,subjects,settings,members,assignments};
 console.log('Legacy schema inventory: starting');
 // Explicit aggregate field-shape counts help diagnose old metadata without exposing values.
 const shape={};
 for(const field of ['classGroup','className','subject','classId','subjectId','examId','term','examName','components','totalFullMarks']){
  const types=settings.map(r=>{const v=r.fields[field];return v===undefined?'missing':v===null?'null':Array.isArray(v)?'array':typeof v});
  shape[field]=countBy(types,x=>x);
 }
 console.log('Legacy field shapes: '+JSON.stringify(shape));
 console.log('Scoped settings and membership summary: starting');
 const result=summarizeStagedSettings(inputs);
 console.log(JSON.stringify(result,null,2));
 if(localReview){
  const files=buildLocalReviewWorkbooks(inputs);
  // mkdtemp creates a private 0700 directory on Cloud Shell/Linux. Exclusive
  // 0600 files: never overwrite an earlier review and never upload them.
  const dir=await mkdtemp(join(homedir(),'smss-v47-review-'));
  await writeFile(join(dir,'settings-review.xlsx'),Buffer.from(await files.settingsBlob.arrayBuffer()),{flag:'wx',mode:0o600});
  await writeFile(join(dir,'assignment-review.xlsx'),Buffer.from(await files.assignmentBlob.arrayBuffer()),{flag:'wx',mode:0o600});
  console.log('Private local workbooks saved: '+dir+'; settings rows '+files.settingsRows+'; assignment rows '+files.assignmentRows);
 }
 console.log('TARGET READ ONLY; FIREBASE WRITES: ZERO; NOT A CONSISTENT SNAPSHOT OR RELEASE APPROVAL');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error('Audit stopped: '+(typeof e?.message==='string'&&/^Target read failed: HTTP [0-9]{3}$/.test(e.message)?e.message:['Registry changed during audit','Target registry identity mismatch','Incomplete or foreign staged inventory','Invalid IEMIS settings audit scope','Class settings audit exceeds 800 records','Unexpected class settings identity','Invalid or foreign settings identity','Invalid subject identity'].includes(e?.message)?e.message:'Invalid scope, incomplete inventory or unavailable operator access ('+(e instanceof TypeError?'TypeError':e instanceof RangeError?'RangeError':'Error')+')'));process.exitCode=1});
