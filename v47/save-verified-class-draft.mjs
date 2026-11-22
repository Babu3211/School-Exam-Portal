// Isolated V47 Firestore class-DRAFT save: one compare-and-swap document,
// not an official mark, publication or grade. No per-student mark writes.
// Requires current authenticated School Admin and complete authoritative roster.
import {verifySchoolSession} from './verified-school-session.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {validateConfiguredMarkComponents} from './configured-mark-preflight.mjs';
import {completeClassDraftId,prepareCompleteClassDraft} from './complete-class-draft-document.mjs';
import {validateSchoolId} from './school-paths.mjs';
export async function saveVerifiedCompleteClassDraft({
 db,api,auth,actor,schoolId,classId,subjectId,examId,drafts,expectedRevision=0
}){
 validateSchoolId(schoolId);
 if(!db||!api||['doc','getDoc','runTransaction','serverTimestamp'].some(name=>typeof api[name]!=='function'))
  throw Error('Firestore draft transaction methods required');
 const uid=auth?.currentUser?.uid;
 if(typeof uid!=='string'||uid!==actor?.uid||actor?.role!=='school_admin'||actor?.active!==true||
    actor?.schoolId!==schoolId)throw Error('Authenticated School Admin required');
 const identity=Object.freeze({uid,schoolId,actor});
 const check=()=>{
  if(auth?.currentUser?.uid!==identity.uid||actor!==identity.actor||
     actor.uid!==identity.uid||actor.role!=='school_admin'||actor.active!==true||
     actor.schoolId!==identity.schoolId)throw Error('School Admin session changed; nothing saved');
 };
 const ref=(collection,id)=>api.doc(db,'schools',schoolId,collection,id);
 const id=completeClassDraftId({classId,subjectId,examId});
 const schoolRef=api.doc(db,'schools',schoolId);
 const memberRef=ref('members',uid),subjectRef=ref('subjects',subjectId),
       settingsRef=ref('mark_settings',id),draftRef=ref('class_mark_drafts',id);
 const readDocument=async path=>{
  const snap=await api.getDoc(api.doc(db,...path.split('/')));
  return snap.exists()?snap.data():null;
 };
 const verify=async()=>{
  check();
  const session=await verifySchoolSession({schoolId,uid,readDocument});
  check();
  if(session.role!=='school_admin')throw Error('School Admin membership revoked');
 };
 await verify();
 const [subjectSnap,settingsSnap]=await Promise.all([api.getDoc(subjectRef),api.getDoc(settingsRef)]);
 check();
 if(!subjectSnap?.exists()||subjectSnap.data()?.schoolId!==schoolId||
    subjectSnap.data()?.class!==classId||subjectSnap.data()?.active!==true)
  throw Error('Active class subject missing');
 if(!settingsSnap?.exists())throw Error('Verified Examination Settings missing');
 const settings={...settingsSnap.data(),settingsId:id};
 validateConfiguredMarkComponents(settings,{schoolId,classId,subjectId,examId});
 const originalComponents=JSON.stringify(settings.components);
 const roster=await loadCompleteClassRoster({db,api,actor,schoolId,classId});
 check();
 if(roster.students.some(student=>!isActiveEnrolledStudent(student)))
  throw Error('Inactive student in complete class roster');
 await verify();
 const planned=prepareCompleteClassDraft({
  actor,schoolId,classId,subjectId,examId,settings,
  expectedStudentIds:roster.studentIds,drafts,expectedRevision
 });
 check();
 await api.runTransaction(db,async tx=>{
  // Read every required document before any write. A changed revision fails
  // atomically; a current roster/settings recheck is still needed for publication.
  const snapshots=await Promise.all([
   tx.get(schoolRef),tx.get(memberRef),tx.get(subjectRef),
   tx.get(settingsRef),tx.get(draftRef)
  ]);
  check();
  const [school,member,subject,setting,prior]=snapshots;
  if(!school.exists()||school.data()?.active!==true||school.data()?.id!==schoolId||
     !member.exists()||member.data()?.uid!==uid||member.data()?.schoolId!==schoolId||
     member.data()?.role!=='school_admin'||member.data()?.active!==true)
   throw Error('School Admin permission changed before draft commit');
  if(!subject.exists()||subject.data()?.schoolId!==schoolId||
     subject.data()?.class!==classId||subject.data()?.active!==true)
   throw Error('Subject changed before draft commit');
  if(!setting.exists()||setting.data()?.id!==id||
     JSON.stringify(setting.data().components)!==originalComponents)
   throw Error('Examination Settings changed before draft commit');
  validateConfiguredMarkComponents(setting.data(),{schoolId,classId,subjectId,examId});
  const currentRevision=prior.exists()?prior.data()?.revision:0;
  if(!Number.isSafeInteger(currentRevision)||currentRevision<0||currentRevision!==expectedRevision)
   throw Error('Class draft changed in another session. Reload before saving.');
  if(prior.exists()){
   const priorData=prior.data();
   if(priorData?.state!=='draft'||priorData?.schoolId!==schoolId||
      priorData?.classId!==classId||priorData?.subjectId!==subjectId||
      priorData?.examId!==examId||priorData?.settingsId!==id)
    throw Error('Stored class draft scope or state invalid');
  }
  check();
  tx.set(draftRef,{...planned.data,updatedAt:api.serverTimestamp()});
 });
 check();
 return Object.freeze({
  schoolId,classId,subjectId,examId,rosterCount:planned.rosterCount,
  savedDraft:true,revision:planned.data.revision,updatedBy:uid,
  officialMarksWritten:false,publicationAllowed:false
 });
}
