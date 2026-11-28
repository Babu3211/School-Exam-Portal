// School Admin can review one teacher's complete-class DRAFT only.
// This deliberately has NO write API, approval or official publication side effect.
import {validateSchoolId} from './school-paths.mjs';
import {completeClassDraftId} from './complete-class-draft-document.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {verifyTeacherSubjectAssignment} from './verified-teacher-subject-assignment.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {validateConfiguredMarkComponents} from './configured-mark-preflight.mjs';
import {verifyStoredTeacherClassDraft,sameTeacherDraftEntries} from './teacher-class-draft.mjs';
import {studentDisplayName} from './student-display-name.mjs';
import {verifyStoredCompleteClassDraft} from './restore-complete-class-draft.mjs';
import {sameMarkJson} from './mark-json-equality.mjs';

export async function loadSchoolAdminTeacherDraftReview({
 db,api,auth,actor,schoolId,teacherUid,classId,subjectId,examId,assertSession=()=>{}
}){
 validateSchoolId(schoolId);
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(teacherUid??''))throw Error('Exact Teacher UID required');
 const draftId=completeClassDraftId({classId,subjectId,examId});
 if(!db||!api||typeof api.doc!=='function'||typeof api.getDoc!=='function')
  throw TypeError('Verified Firestore reader required');
 if(typeof assertSession!=='function')throw TypeError('Session check required');
 const uid=auth?.currentUser?.uid;
 if(!uid||actor?.uid!==uid||actor?.role!=='school_admin'||actor?.active!==true||actor.schoolId!==schoolId)
  throw Error('Active School Admin session required');
 const check=()=>{
  assertSession();
  if(auth?.currentUser?.uid!==uid||actor.uid!==uid||actor.role!=='school_admin'||
     actor.active!==true||actor.schoolId!==schoolId)
   throw Error('School Admin session changed during Draft Review');
 };
 const readDocument=async path=>{
  check();
  const snap=await api.getDoc(api.doc(db,...path.split('/')));
  check();
  return snap?.exists?.()?snap.data():null;
 };
 const verifyAdmin=async()=>{
  check();
  const session=await verifySchoolSession({schoolId,uid,readDocument});
  check();
  if(session.role!=='school_admin')throw Error('School Admin membership revoked');
 };
 const teacher={uid:teacherUid,role:'teacher',active:true,schoolId};
 const verifyTeacher=async()=>{
  await verifyAdmin();
  const member=await verifySchoolSession({schoolId,uid:teacherUid,readDocument});
  check();
  if(member.role!=='teacher')throw Error('Selected Teacher is not an active member');
 };
 const verifyDuty=async()=>verifyTeacherSubjectAssignment({
  db,api,actor:teacher,schoolId,classId,subjectId,revalidate:verifyTeacher
 });
 await verifyTeacher();
 const duty=await verifyDuty();
 const settingsPath='schools/'+schoolId+'/mark_settings/'+draftId;
 const settingsDoc=await readDocument(settingsPath);
 if(settingsDoc?.id!==draftId)throw Error('Examination Settings missing or changed');
 const settings={...settingsDoc,settingsId:draftId};
 const components=validateConfiguredMarkComponents(settings,{schoolId,classId,subjectId,examId});
 const roster=await loadCompleteClassRoster({db,api,actor,schoolId,classId});
 check();
 if(roster.students.some(student=>!isActiveEnrolledStudent(student)))
  throw Error('Class roster contains inactive records; review enrollment first');
 const draftPath='schools/'+schoolId+'/teacher_mark_drafts/'+teacherUid+'/class_drafts/'+draftId;
 const stored=await readDocument(draftPath);
 await verifyDuty();
 if(!stored){
  // A missing Draft is also a time-sensitive result: do not report "not found"
  // if it appears, or the roster/settings/duty change during this lookup.
  const [freshRoster,latestSettings,latestDraft]=await Promise.all([
   loadCompleteClassRoster({db,api,actor,schoolId,classId}),
   readDocument(settingsPath),readDocument(draftPath)
  ]);
  check();
  if(latestDraft||
   roster.count!==freshRoster.count||
   roster.studentIds.some((id,i)=>id!==freshRoster.studentIds[i])||
   roster.students.some((student,i)=>JSON.stringify(student)!==JSON.stringify(freshRoster.students[i]))||
   freshRoster.students.some(student=>!isActiveEnrolledStudent(student)))
   throw Error('Teacher Draft or enrollment changed during lookup; reload');
  if(!latestSettings||JSON.stringify(latestSettings)!==JSON.stringify(settingsDoc))
   throw Error('Examination Settings changed during Teacher Draft lookup');
  await verifyDuty();
  check();
  return Object.freeze({found:false,schoolId,teacherUid,classId,subjectId,examId,
   subjectName:duty.subjectName,rosterCount:roster.count,entries:Object.freeze([]),
   reviewOnly:true,officialMarksWritten:false,publicationAllowed:false});
 }
 const verified=verifyStoredTeacherClassDraft({
  actor:teacher,schoolId,classId,subjectId,examId,settings,
  expectedStudentIds:roster.studentIds,stored
 });
 // Re-read all authoritative inputs after validating the draft. A mid-read
 // assignment, role, enrollment, settings or revision change must not appear approved.
 const [freshRoster,latestSettings,latestDraft]=await Promise.all([
  loadCompleteClassRoster({db,api,actor,schoolId,classId}),
  readDocument(settingsPath),readDocument(draftPath)
 ]);
 check();
 if(roster.count!==freshRoster.count||
  roster.studentIds.some((id,i)=>id!==freshRoster.studentIds[i])||
  roster.students.some((student,i)=>JSON.stringify(student)!==JSON.stringify(freshRoster.students[i]))||
  freshRoster.students.some(student=>!isActiveEnrolledStudent(student)))
  throw Error('Enrollment changed during Teacher Draft Review');
 if(!latestSettings||JSON.stringify(latestSettings)!==JSON.stringify(settingsDoc))
  throw Error('Examination Settings changed during Teacher Draft Review');
 if(!latestDraft||latestDraft.revision!==stored.revision||
  !sameTeacherDraftEntries(latestDraft.entries,stored.entries))
  throw Error('Teacher Draft revision or marks changed during Review');
 await verifyDuty();
 check();
 const byStudent=new Map(roster.students.map(student=>[student.id,student]));
 const entries=verified.entries.map(entry=>Object.freeze({
  ...entry,values:entry.values?Object.freeze({...entry.values}):null,
  studentName:studentDisplayName(byStudent.get(entry.studentId)??{id:entry.studentId})
 }));
 return Object.freeze({found:true,schoolId,teacherUid,classId,subjectId,examId,
  subjectName:duty.subjectName,rosterCount:roster.count,revision:verified.revision,
  components:Object.freeze(components),entries:Object.freeze(entries),
  reviewOnly:true,officialMarksWritten:false,publicationAllowed:false});
}

// Read-only comparison of an existing Admin Draft against the verified teacher
// revision. This is never authorization to replace a previously saved Draft.
export function compareAdminDraftToTeacherReview(review,stored){
 if(review?.found!==true||review.reviewOnly!==true||review.publicationAllowed!==false||!Array.isArray(review.entries)||review.entries.length!==review.rosterCount)throw Error('Verified Teacher Draft required');
 if(stored===null)return Object.freeze({exists:false,valid:true,copyAllowed:true});
 const {schoolId,classId,subjectId,examId}=review;
 const scope={schoolId,classId,subjectId,examId};
 const id=completeClassDraftId(scope);
 try{
  const restored=verifyStoredCompleteClassDraft({...scope,settings:{...scope,settingsId:id,active:true,components:review.components},expectedStudentIds:review.entries.map(e=>e.studentId),stored});
  const byId=new Map(restored.entries.map(e=>[e.studentId,e]));
  const differences=review.entries.filter(row=>{
   const prior=byId.get(row.studentId);
   return !prior||row.isAbsent!==prior.isAbsent||!sameMarkJson(row.values,prior.values)||row.totalObtained!==prior.totalObtained;
  }).length;
  return Object.freeze({exists:true,valid:true,revision:restored.revision,differences,copyAllowed:false});
 }catch{return Object.freeze({exists:true,valid:false,copyAllowed:false})}
}
