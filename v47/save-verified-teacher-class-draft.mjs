// Authenticated, CAS-safe Teacher DRAFT. Uses verified tenant/assignment,
// full roster and configured components. No official mark write or publication.
import {verifySchoolSession} from './verified-school-session.mjs';
import {verifyTeacherSubjectAssignment} from './verified-teacher-subject-assignment.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {validateConfiguredMarkComponents} from './configured-mark-preflight.mjs';
import {completeClassDraftId} from './complete-class-draft-document.mjs';
import {prepareTeacherClassDraft,sameTeacherDraftEntries} from './teacher-class-draft.mjs';
import {validateSchoolId} from './school-paths.mjs';

export class TeacherDraftPostSaveReviewError extends Error {
 constructor(revision,cause){
  super('Teacher Draft transaction acknowledged, but the stored revision, roster or assignment could not be rechecked. Reload before retrying.');
  this.name='TeacherDraftPostSaveReviewError';
  this.revision=revision;this.committed=true;this.reviewRequired=true;this.cause=cause;
 }
}
export async function saveVerifiedTeacherClassDraft({
 db,api,auth,actor,schoolId,classId,subjectId,examId,drafts,expectedRevision=0
}){
 validateSchoolId(schoolId);
 if(!db||!api||['doc','getDoc','runTransaction','serverTimestamp'].some(k=>typeof api[k]!=='function'))
  throw TypeError('Trusted Firestore transaction adapter required');
 const uid=auth?.currentUser?.uid;
 if(typeof uid!=='string'||uid!==actor?.uid||actor?.role!=='teacher'||
  actor?.active!==true||actor?.schoolId!==schoolId)throw Error('Active authenticated Teacher required');
 const identity={uid,schoolId,actor};
 const check=()=>{
  if(auth?.currentUser?.uid!==identity.uid||actor!==identity.actor||
   actor?.uid!==uid||actor?.role!=='teacher'||actor?.active!==true||actor?.schoolId!==schoolId)
   throw Error('Teacher session changed; Draft must be reloaded');
 };
 const ref=(...parts)=>api.doc(db,'schools',schoolId,...parts);
 const readDocument=async path=>{
  const snap=await api.getDoc(api.doc(db,...path.split('/')));
  return snap?.exists?.()?snap.data():null;
 };
 const verify=async()=>{
  check();
  const membership=await verifySchoolSession({schoolId,uid,readDocument});
  check();
  if(membership.role!=='teacher')throw Error('Teacher membership revoked');
 };
 const verifyAssignment=async()=>verifyTeacherSubjectAssignment({
  db,api,actor,schoolId,classId,subjectId,revalidate:verify
 });
 await verifyAssignment();
 const id=completeClassDraftId({classId,subjectId,examId});
 const schoolRef=api.doc(db,'schools',schoolId);
 const memberRef=ref('members',uid),assignmentRef=ref('teacher_assignments',schoolId+':'+uid+':'+classId+':'+subjectId);
 const subjectRef=ref('subjects',subjectId),settingsRef=ref('mark_settings',id);
 const draftRef=ref('teacher_mark_drafts',uid,'class_drafts',id);
 const settingSnap=await api.getDoc(settingsRef);
 check();
 if(!settingSnap?.exists?.()||settingSnap.data()?.id!==id)throw Error('Verified Examination Settings unavailable');
 const settings={...settingSnap.data(),settingsId:id};
 validateConfiguredMarkComponents(settings,{schoolId,classId,subjectId,examId});
 const settingsJson=JSON.stringify(settings.components);
 const roster=await loadCompleteClassRoster({db,api,actor,schoolId,classId});
 check();
 if(roster.students.some(student=>!isActiveEnrolledStudent(student)))
  throw Error('Inactive student in teacher class roster');
 await verifyAssignment();
 const planned=prepareTeacherClassDraft({actor,schoolId,classId,subjectId,examId,
  settings,expectedStudentIds:roster.studentIds,drafts,expectedRevision});
 check();
 await api.runTransaction(db,async tx=>{
  const refs=[schoolRef,memberRef,assignmentRef,subjectRef,settingsRef,draftRef];
  const snaps=await Promise.all(refs.map(ref=>tx.get(ref)));
  check();
  const [school,member,assignment,subject,setting,prior]=snaps;
  if(!school.exists()||school.data()?.active!==true||school.data()?.id!==schoolId||
   !member.exists()||member.data()?.uid!==uid||member.data()?.schoolId!==schoolId||
   member.data()?.role!=='teacher'||member.data()?.active!==true)
   throw Error('Teacher membership changed before Draft commit');
  if(!assignment.exists()||assignment.data()?.schoolId!==schoolId||
   assignment.data()?.uid!==uid||assignment.data()?.classId!==classId||
   assignment.data()?.subjectId!==subjectId||assignment.data()?.active!==true)
   throw Error('Teacher subject assignment revoked before Draft commit');
  if(!subject.exists()||subject.data()?.schoolId!==schoolId||
   subject.data()?.class!==classId||subject.data()?.active!==true)
   throw Error('Assigned subject changed before Draft commit');
  if(!setting.exists()||setting.data()?.id!==id||
   JSON.stringify(setting.data()?.components)!==settingsJson)
   throw Error('Examination Settings changed before Draft commit');
  validateConfiguredMarkComponents(setting.data(),{schoolId,classId,subjectId,examId});
  const oldRevision=prior.exists()?prior.data()?.revision:0;
  if(!Number.isSafeInteger(oldRevision)||oldRevision!==expectedRevision)
   throw Error('Teacher Draft revision changed. Reload before saving.');
  if(prior.exists()){
   const p=prior.data();
   if(p?.format!==planned.data.format||p?.state!=='draft'||
    p?.schoolId!==schoolId||p?.classId!==classId||p?.subjectId!==subjectId||
    p?.examId!==examId||p?.settingsId!==id||p?.updatedBy!==uid)
    throw Error('Stored Teacher Draft identity mismatch');
  }
  check();
  tx.set(draftRef,{...planned.data,updatedAt:api.serverTimestamp()});
 });
 // The transaction was acknowledged. A failed final check requires a review,
 // NEVER a claim that the committed write was rolled back.
 try{
  check();
  const [savedSnap,latestRoster]=await Promise.all([
   api.getDoc(draftRef),loadCompleteClassRoster({db,api,actor,schoolId,classId})
  ]);
  check();
  if(!savedSnap?.exists?.())throw Error('Committed Teacher Draft missing');
  const persisted=savedSnap.data();
  if(persisted?.revision!==planned.data.revision||persisted?.format!==planned.data.format||
   persisted?.schoolId!==schoolId||persisted?.updatedBy!==uid||
   !sameTeacherDraftEntries(persisted.entries,planned.data.entries))
   throw Error('Committed Teacher Draft revision or contents changed');
  if(latestRoster.studentIds.length!==roster.studentIds.length||
   latestRoster.studentIds.some((v,i)=>v!==roster.studentIds[i])||
   latestRoster.students.some(student=>!isActiveEnrolledStudent(student)))
   throw Error('Teacher class enrollment changed during Draft Save');
  await verifyAssignment();
 }catch(cause){
  throw new TeacherDraftPostSaveReviewError(planned.data.revision,cause);
 }
 return Object.freeze({savedDraft:true,rosterReverified:true,schoolId,classId,subjectId,examId,
  rosterCount:planned.rosterCount,revision:planned.data.revision,publicationAllowed:false,
  officialMarksWritten:false});
}
