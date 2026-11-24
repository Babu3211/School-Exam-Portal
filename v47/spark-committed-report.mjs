// Spark read-only current committed result view. Never reads raw staging or private drafts.
import {verifySchoolSession} from './verified-school-session.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {completeClassDraftId} from './complete-class-draft-document.mjs';
import {validateConfiguredMarkComponents} from './configured-mark-preflight.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {convertVerifiedSubjectPreview} from './iemis-verified-subject-preview.mjs';
import {validateSchoolId} from './school-paths.mjs';
export async function loadSparkCommittedReport({db,api,auth,actor,schoolId,classNo,term,assertCurrent,onProgress=()=>{}}){
 validateSchoolId(schoolId);
 const uid=auth?.currentUser?.uid;
 if(!uid||actor?.uid!==uid||actor?.schoolId!==schoolId||actor?.active!==true||!['school_admin','teacher','viewer'].includes(actor?.role)||typeof assertCurrent!=='function')
  throw Error('Verified active school membership required');
 if(!/^(?:[1-9]|10)$/.test(classNo)||!['1st','2nd','3rd','final'].includes(term))throw Error('IEMIS Classes 1–10 and exam terms only');
 const role=actor.role;
 const check=()=>{assertCurrent();if(auth.currentUser?.uid!==uid||actor.role!==role||actor.active!==true||actor.schoolId!==schoolId)throw Error('School session changed')};
 const readDocument=async path=>{const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return snap.exists()?snap.data():null};
 const verify=async()=>{check();const session=await verifySchoolSession({schoolId,uid,readDocument});check();if(session.role!==role)throw Error('School membership changed')};
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
 if(roster.students.some(s=>!isActiveEnrolledStudent(s)))throw Error('Inactive student in published roster');
 const subjects=await subjectsQuery();onProgress('Checking '+subjects.length+' published subjects for '+roster.count+' students');
 const path=(...parts)=>api.doc(db,'schools',schoolId,...parts);
 const keys=new Map();for(const sub of subjects)keys.set(sub.id,await hash(JSON.stringify([classNo,sub.id,term])));
 const snapshot=await api.runTransaction(db,async tx=>{
  const [school,member,profile]=await Promise.all([tx.get(path()),tx.get(path('members',uid)),tx.get(path('school_settings','profile'))]);check();
  const sc=school.exists()?school.data():null,mem=member.exists()?member.data():null,pr=profile.exists()?profile.data():null;
  if(sc?.id!==schoolId||sc.active!==true||mem?.uid!==uid||mem.schoolId!==schoolId||mem.active!==true||mem.role!==role||pr&&pr.schoolId!==schoolId)throw Error('School membership or profile changed');
  const bySubject=new Map();
  for(const subject of subjects){
   const id=completeClassDraftId({classId:classNo,subjectId:subject.id,examId:term});
   const [current,settings,stored]=await Promise.all([tx.get(path('subjects',subject.id)),tx.get(path('mark_settings',id)),tx.get(path('official_read_views',keys.get(subject.id)))]);check();
   if(!current.exists()||!same({...current.data(),id:subject.id},subject))throw Error('Subject changed during report');
   if(!settings.exists()||!stored.exists())throw Error('Missing settings or committed read view for '+subject.name);
   const config=settings.data();
   if(config.id!==id||config.active!==true)throw Error('Inactive or mismatched settings');
   const view=stored.data(),scope={schoolId,classId:classNo,subjectId:subject.id,examId:term};
   const components=validateConfiguredMarkComponents(config,scope);
   if(view.format!=='smss-v47-official-read-view-v1'||Object.entries(scope).some(([k,v])=>view[k]!==v)||
    !/^[A-Za-z0-9_-]{8,128}$/.test(view.publicationId??'')||
    !/^[a-f0-9]{64}$/.test(view.digest??'')||view.rosterCount!==roster.count||
    !Array.isArray(view.entries)||view.entries.length!==roster.count)throw Error('Invalid committed read view');
   if(await hash(JSON.stringify(canonical({...scope,components})))!==view.settingsDigest)throw Error('Published Examination Settings changed');
   const pages=[];
   for(let i=0;i<view.entries.length;i+=100){
    const entries=view.entries.slice(i,i+100);
    pages.push({index:i/100,count:entries.length,firstStudentId:entries[0].studentId,lastStudentId:entries.at(-1).studentId,entries});
   }
   if(await hash(JSON.stringify(canonical(pages)))!==view.contentDigest)throw Error('Published content digest mismatch');
   if(view.entries.some((row,i)=>row.studentId!==roster.studentIds[i]))throw Error('Published student roster changed');
   bySubject.set(subject.id,{components,entries:view.entries});
  }
  return {school:{nameEnglish:pr?.nameEnglish||sc.name,nameNepali:pr?.nameNepali||'',addressEnglish:pr?.addressEnglish||'',addressNepali:pr?.addressNepali||''},bySubject};
 });
 const after=await loadCompleteClassRoster({db,api:serverApi,actor,schoolId,classId:classNo});check();
 const afterSubjects=await subjectsQuery();
 if(!same(after.students,roster.students)||!same(afterSubjects,subjects))throw Error('Roster or subjects changed during committed review; reload');
 await verify();
 const result=convertVerifiedSubjectPreview({schoolId,school:snapshot.school,classNo,term,students:roster.students,subjects,bySubject:snapshot.bySubject});check();
 return Object.freeze({...result,committedViewPreview:true,publicationAllowed:false});
}
function canonical(v){
 if(Array.isArray(v))return v.map(canonical);
 if(v&&typeof v==='object'){if(typeof v.toMillis==='function')return v.toMillis();return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]))}
 return v;
}
function same(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}

async function hash(value){const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')}
