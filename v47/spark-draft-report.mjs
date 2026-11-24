// Firebase Spark browser reader for PRIVATE School Admin draft previews only.
// No official result, server dependency, publication, or raw mark writes.
import {verifySchoolSession} from './verified-school-session.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {completeClassDraftId} from './complete-class-draft-document.mjs';
import {verifyStoredCompleteClassDraft} from './restore-complete-class-draft.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {convertVerifiedSubjectPreview} from './iemis-verified-subject-preview.mjs';
import {validateSchoolId} from './school-paths.mjs';
export async function loadSparkDraftReport({db,api,auth,actor,schoolId,classNo,term,assertCurrent,onProgress=()=>{}}){
 validateSchoolId(schoolId);
 const uid=auth?.currentUser?.uid;
 if(!uid||actor?.uid!==uid||actor?.schoolId!==schoolId||actor?.active!==true||actor?.role!=='school_admin'||typeof assertCurrent!=='function')
  throw Error('School Admin required for private Draft preview');
 if(!/^(?:[1-9]|10)$/.test(classNo)||!['1st','2nd','3rd','final'].includes(term))throw Error('IEMIS Classes 1–10 and exam terms only');
 const check=()=>{assertCurrent();if(auth.currentUser?.uid!==uid||actor.role!=='school_admin'||actor.active!==true||actor.schoolId!==schoolId)throw Error('School session changed')};
 const readDocument=async path=>{const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return snap.exists()?snap.data():null};
 const verify=async()=>{check();const session=await verifySchoolSession({schoolId,uid,readDocument});check();if(session.role!=='school_admin')throw Error('School Admin revoked')};
 const subjectsQuery=async()=>{
  const q=api.query(api.collection(db,'schools',schoolId,'subjects'),api.where('class','==',classNo),api.orderBy('__name__'),api.limit(31));
  const snap=await api.getDocsFromServer(q);check();
  if(!snap.docs.length||snap.docs.length>30)throw Error('Complete class subject catalog required');
  const list=snap.docs.map(d=>({...d.data(),id:d.id}));
  if(list.some(s=>s.schoolId!==schoolId||s.class!==classNo||s.active!==true)||new Set(list.map(s=>s.id)).size!==list.length)throw Error('Invalid class subject catalog');
  return list;
 };
 // Server-only query reads to avoid stale browser cache being treated as verified.
 const serverApi={...api,getDocs:api.getDocsFromServer,getDoc:api.getDocFromServer};
 await verify();
 const roster=await loadCompleteClassRoster({db,api:serverApi,actor,schoolId,classId:classNo});check();
 if(roster.students.some(s=>!isActiveEnrolledStudent(s)))throw Error('Inactive student in Draft roster');
 const subjects=await subjectsQuery();onProgress('Checking '+subjects.length+' subject Drafts for '+roster.count+' students');
 const path=(...parts)=>api.doc(db,'schools',schoolId,...parts);
 const snapshot=await api.runTransaction(db,async tx=>{
  const [school,member,profile]=await Promise.all([tx.get(path()),tx.get(path('members',uid)),tx.get(path('school_settings','profile'))]);check();
  const sc=school.exists()?school.data():null,mem=member.exists()?member.data():null,pr=profile.exists()?profile.data():null;
  if(sc?.id!==schoolId||sc.active!==true||mem?.uid!==uid||mem.schoolId!==schoolId||mem.active!==true||mem.role!=='school_admin'||pr&&pr.schoolId!==schoolId)throw Error('School Admin access or profile changed');
  const bySubject=new Map();
  for(const subject of subjects){
   const id=completeClassDraftId({classId:classNo,subjectId:subject.id,examId:term});
   const [current,settings,stored]=await Promise.all([tx.get(path('subjects',subject.id)),tx.get(path('mark_settings',id)),tx.get(path('class_mark_drafts',id))]);check();
   if(!current.exists()||!same({...current.data(),id:subject.id},subject))throw Error('Subject changed during report');
   if(!settings.exists()||!stored.exists())throw Error('Missing settings or saved Draft for '+subject.name);
   const config=settings.data();
   if(config.id!==id||config.active!==true)throw Error('Inactive or mismatched settings');
   const verified=verifyStoredCompleteClassDraft({schoolId,classId:classNo,subjectId:subject.id,examId:term,settings:{...config,settingsId:id},expectedStudentIds:roster.studentIds,stored:stored.data()});
   bySubject.set(subject.id,{components:config.components,entries:verified.entries,revision:verified.revision});
  }
  return {school:{nameEnglish:pr?.nameEnglish||sc.name,nameNepali:pr?.nameNepali||'',addressEnglish:pr?.addressEnglish||'',addressNepali:pr?.addressNepali||''},bySubject};
 });
 const after=await loadCompleteClassRoster({db,api:serverApi,actor,schoolId,classId:classNo});check();
 const afterSubjects=await subjectsQuery();
 if(!same(after.students,roster.students)||!same(afterSubjects,subjects))throw Error('Roster or subjects changed during Draft review; reload');
 await verify();
 const result=convertVerifiedSubjectPreview({schoolId,school:snapshot.school,classNo,term,students:roster.students,subjects,bySubject:snapshot.bySubject});check();
 return Object.freeze({...result,draftPreview:true,publicationAllowed:false});
}
function canonical(v){
 if(Array.isArray(v))return v.map(canonical);
 if(v&&typeof v==='object'){if(typeof v.toMillis==='function')return v.toMillis();return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]))}
 return v;
}
function same(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}
