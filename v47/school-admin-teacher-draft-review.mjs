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
  studentName:String(byStudent.get(entry.studentId)?.name??entry.studentId)
 }));
 return Object.freeze({found:true,schoolId,teacherUid,classId,subjectId,examId,
  subjectName:duty.subjectName,rosterCount:roster.count,revision:verified.revision,
  components:Object.freeze(components),entries:Object.freeze(entries),
  reviewOnly:true,officialMarksWritten:false,publicationAllowed:false});
}
