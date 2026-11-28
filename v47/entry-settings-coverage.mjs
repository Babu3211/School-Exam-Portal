// Read-only class/term inventory of actual saved V47 settings against the
// preserved V46 IEMIS entry schema. Never creates or modifies settings.
import {iemisEntrySchema} from './iemis-entry.js';
import {iemisComponentKey} from './iemis-ledger.js';
import {validateConfiguredMarkComponents,primaryAchievementPair} from './configured-mark-preflight.mjs';
import {completeClassDraftId} from './complete-class-draft-document.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {readSchoolSubjectCatalog} from './subject-catalog-view.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
const terms={'1st':'first','2nd':'second','3rd':'third',final:'annual'};
const idPattern=/^[A-Za-z0-9_-]{1,128}$/;
const auditClass=/^(?:ECD|LKG|UKG|[1-9]|1[012])$/;
const readyStatus=s=>s==='Schema match'||s==='Configured settings valid';
export function auditEntrySettingsCoverage({schoolId,classId,examId,subjects,settings}){
 if(!/^\d{5,20}$/.test(schoolId)||!auditClass.test(classId)||!Object.hasOwn(terms,examId)||!Array.isArray(subjects)||subjects.length>100||!Array.isArray(settings)||settings.length>200)throw Error('Invalid IEMIS settings audit scope');
 const seen=new Set(),groups=new Map(),rows=[];
 for(const s of subjects){if(!idPattern.test(s.id??'')||seen.has(s.id)||typeof s.name!=='string'||!s.name.trim())throw Error('Invalid subject identity');seen.add(s.id)}
 const ids=new Set();
 for(const d of settings){
  if(!idPattern.test(d.id??'')||ids.has(d.id)||d.schoolId!==schoolId||d.classId!==classId||d.examId!==examId||!idPattern.test(d.subjectId??''))throw Error('Invalid or foreign settings identity');
  ids.add(d.id);const group=groups.get(d.subjectId)??[];group.push(d);groups.set(d.subjectId,group);
 }
 const text=parts=>parts.map(c=>c&&typeof c.name==='string'&&typeof c.fullMarks==='number'?c.name+' / '+c.fullMarks:'Invalid component').join(' | ');
 for(const s of subjects){
  const records=groups.get(s.id)??[],active=records.filter(d=>d.active===true);
  if(s.active!==true){rows.push({subjectId:s.id,subject:s.name,status:'Inactive or unverified subject',expected:'',configured:text(active.flatMap(d=>Array.isArray(d.components)?d.components:[]))});continue}
  const schema=/^(?:[1-9]|10)$/.test(classId)?iemisEntrySchema(classId,terms[examId],s.name).filter(c=>!c.readonly):null,primary=/^[1-5]$/.test(classId);
  const expected=!schema?'No IEMIS reference for this class':primary?'Achievement count; obtained maximum = count × 4':text(schema.map(c=>({name:c.name,fullMarks:c.max})));
  let status='Missing active settings',configured='';
  if(records.some(d=>typeof d.active!=='boolean'))status='Invalid active flag';
  else if(active.length>1)status='Duplicate active settings';
  else if(active.length===1){
   const d=active[0];
   try{
    const parts=validateConfiguredMarkComponents(d,{schoolId,classId,examId,subjectId:s.id});
    configured=text(parts);
    const keys=parts.map(c=>iemisComponentKey(c.name));
    const compatible=!!schema&&parts.length===schema.length&&new Set(keys).size===keys.length&&schema.every(c=>keys.includes(c.key))&&(primary?!!primaryAchievementPair(parts,classId):schema.every(c=>parts[keys.indexOf(c.key)].fullMarks===c.max));
    status=d.id!==completeClassDraftId({classId,subjectId:s.id,examId})?'Noncanonical settings ID':compatible?'Schema match':'Configured settings valid';
   }catch{status='Invalid settings'}
  }
  rows.push({subjectId:s.id,subject:s.name,status,expected,configured});
 }
 for(const [sid,records] of groups)if(!seen.has(sid))rows.push({subjectId:sid,subject:sid,status:'Settings without registered subject',expected:'',configured:records.map(d=>d.id).join(' | ')});
 return Object.freeze({schoolId,classId,examId,rows:Object.freeze(rows.map(Object.freeze)),matched:rows.filter(r=>readyStatus(r.status)).length,referenceMatched:rows.filter(r=>r.status==='Schema match').length,customValid:rows.filter(r=>r.status==='Configured settings valid').length,reviewRequired:rows.filter(r=>!readyStatus(r.status)).length,writeAuthorized:false,iemisVerified:false});
}
export async function readEntrySettingsCoverage({db,api,auth,actor,schoolId,classId,examId,assertCurrent}){
 if(actor?.role!=='school_admin'||actor.active!==true||actor.schoolId!==schoolId||auth?.currentUser?.uid!==actor.uid||!Object.hasOwn(terms,examId)||!auditClass.test(classId))throw Error('Verified School Admin and IEMIS class/term required');
 const uid=actor.uid;
 const check=()=>{assertCurrent();if(auth.currentUser?.uid!==uid||actor.uid!==uid||actor.schoolId!==schoolId||actor.role!=='school_admin'||actor.active!==true)throw Error('School session changed')};
 const verify=async()=>{check();const s=await verifySchoolSession({schoolId,uid,readDocument:async path=>{const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return snap.exists()?snap.data():null}});check();if(s.role!=='school_admin')throw Error('School Admin required')};
 await verify();
 const subjects=await readSchoolSubjectCatalog({db,api,actor,schoolId,schoolClass:classId,assertCurrent:check});
 const q=api.query(api.collection(db,'schools',schoolId,'mark_settings'),api.where('classId','==',classId),api.where('examId','==',examId),api.limit(201));
 const snap=await api.getDocsFromServer(q);check();
 const settings=snap.docs.map(d=>{const v=d.data();if(v.id!==d.id||d.ref?.path!==undefined&&d.ref.path!=='schools/'+schoolId+'/mark_settings/'+d.id)throw Error('Settings document identity mismatch');return v});
 const result=auditEntrySettingsCoverage({schoolId,classId,examId,subjects,settings});await verify();return result;
}

export function entrySettingsAuditWorkbook(result){
 if(result?.writeAuthorized!==false||result.iemisVerified!==false||!/^\d{5,20}$/.test(result.schoolId)||!auditClass.test(result.classId)||!Object.hasOwn(terms,result.examId)||!Array.isArray(result.rows)||result.rows.length>300)throw Error('Invalid read-only audit result');
 const headers=['Notice','School ID','Class','Term','Subject ID','Subject','Status','Optional V46 reference','Saved V47 settings'];
 const rows=result.rows.map(r=>['Saved settings validation; reference only — NOT verified against live IEMIS',result.schoolId,result.classId,result.examId,r.subjectId,r.subject,r.status,r.expected,r.configured]);
 return {blob:excelWorkbook(headers,rows,{sheetName:'Settings audit'}),filename:'V47-SETTINGS-AUDIT-'+result.schoolId+'-'+result.classId+'-'+result.examId+'.xlsx'};
}

// Four supported IEMIS terms in one class. Reuse one authoritative catalogue
// and one bounded server query; never scan students, marks or other schools.
export function auditAllTermSettingsCoverage({schoolId,classId,subjects,settings}){
 if(!Array.isArray(settings)||settings.length>800)throw Error('Class settings audit exceeds 800 records');
 const byTerm=new Map(Object.keys(terms).map(t=>[t,[]])),ids=new Set();
 for(const d of settings){
  if(!d||d.schoolId!==schoolId||d.classId!==classId||!byTerm.has(d.examId)||ids.has(d.id))throw Error('Unexpected class settings identity');
  ids.add(d.id);byTerm.get(d.examId).push(d);
 }
 const reports=Object.keys(terms).map(examId=>auditEntrySettingsCoverage({schoolId,classId,examId,subjects,settings:byTerm.get(examId)}));
 return Object.freeze({schoolId,classId,reports:Object.freeze(reports),matched:reports.reduce((n,r)=>n+r.matched,0),referenceMatched:reports.reduce((n,r)=>n+r.referenceMatched,0),customValid:reports.reduce((n,r)=>n+r.customValid,0),reviewRequired:reports.reduce((n,r)=>n+r.reviewRequired,0),writeAuthorized:false,iemisVerified:false});
}
export async function readAllTermSettingsCoverage({db,api,auth,actor,schoolId,classId,assertCurrent}){
 if(actor?.role!=='school_admin'||actor.active!==true||actor.schoolId!==schoolId||auth?.currentUser?.uid!==actor.uid||!auditClass.test(classId))throw Error('Verified School Admin and class required');
 const uid=actor.uid;
 const check=()=>{assertCurrent();if(auth.currentUser?.uid!==uid||actor.uid!==uid||actor.schoolId!==schoolId||actor.role!=='school_admin'||actor.active!==true)throw Error('School session changed')};
 const verify=async()=>{check();const s=await verifySchoolSession({schoolId,uid,readDocument:async path=>{const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return snap.exists()?snap.data():null}});check();if(s.role!=='school_admin')throw Error('School Admin required')};
 await verify();
 const subjects=await readSchoolSubjectCatalog({db,api,actor,schoolId,schoolClass:classId,assertCurrent:check});
 const q=api.query(api.collection(db,'schools',schoolId,'mark_settings'),api.where('classId','==',classId),api.where('examId','in',Object.keys(terms)),api.limit(801));
 const snap=await api.getDocsFromServer(q);check();
 const settings=snap.docs.map(d=>{const v=d.data();if(v.id!==d.id||d.ref?.path!==undefined&&d.ref.path!=='schools/'+schoolId+'/mark_settings/'+d.id)throw Error('Settings document identity mismatch');return v});
 const result=auditAllTermSettingsCoverage({schoolId,classId,subjects,settings});await verify();return result;
}
export function allTermSettingsAuditWorkbook(result){
 if(result?.writeAuthorized!==false||result.iemisVerified!==false||!/^\d{5,20}$/.test(result.schoolId)||!auditClass.test(result.classId)||!Array.isArray(result.reports)||result.reports.length!==4||result.reports.some((r,i)=>r.schoolId!==result.schoolId||r.classId!==result.classId||r.examId!==Object.keys(terms)[i]||r.writeAuthorized!==false||r.iemisVerified!==false||!Array.isArray(r.rows)||r.rows.length>300))throw Error('Invalid all-term audit result');
 const headers=['Notice','School ID','Class','Term','Subject ID','Subject','Status','Optional V46 reference','Saved V47 settings'];
 const rows=result.reports.flatMap(r=>r.rows.map(v=>['Saved settings validation; reference only — NOT verified against live IEMIS',r.schoolId,r.classId,r.examId,v.subjectId,v.subject,v.status,v.expected,v.configured]));
 return {blob:excelWorkbook(headers,rows,{sheetName:'All term settings'}),filename:'V47-SETTINGS-AUDIT-'+result.schoolId+'-'+result.classId+'-ALL-TERMS.xlsx'};
}
