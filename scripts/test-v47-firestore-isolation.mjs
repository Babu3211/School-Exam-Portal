import {initializeTestEnvironment,assertFails,assertSucceeds} from "@firebase/rules-unit-testing";
import {readFileSync} from "node:fs";
import {doc,getDoc,setDoc,updateDoc,deleteDoc,collection,getDocs} from "firebase/firestore";
const rules=readFileSync(new URL("../firestore.v47.prototype.rules",import.meta.url),"utf8");
const env=await initializeTestEnvironment({projectId:"smss-v47-tenant-rules-test",firestore:{rules,host:"127.0.0.1",port:8080}});
const schoolA="school_A001",schoolB="school_B001";
try {
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  for(const schoolId of [schoolA,schoolB]){
   await setDoc(doc(db,"schools",schoolId),{name:schoolId,status:"active"});
   await setDoc(doc(db,"schools",schoolId,"students","student1"),{name:"Synthetic Student",classId:"9"});
   await setDoc(doc(db,"schools",schoolId,"subjects","computer"),{name:"Computer"});
  }
  await setDoc(doc(db,"schools",schoolB,"subjects","schoolB_only"),{name:"Only school B"});
  await setDoc(doc(db,"schools",schoolA,"members","adminA"),{active:true,roles:["school_admin"]});
  await setDoc(doc(db,"schools",schoolA,"members","viewerA"),{active:true,roles:["viewer"]});
  await setDoc(doc(db,"schools",schoolA,"members","teacherA"),{active:true,roles:["subject_teacher"]});
  await setDoc(doc(db,"platform_admins","root"),{active:true});
  await setDoc(doc(db,"schools",schoolA,"assignments","teacherA_9_computer"),{uid:"teacherA",schoolId:schoolA,classId:"9",kind:"subject_teacher",active:true,terms:["first"]});
  await setDoc(doc(db,"schools",schoolA,"assignments","classA_9"),{uid:"classA",schoolId:schoolA,classId:"9",kind:"class_teacher",active:true,terms:["first"]});
  await setDoc(doc(db,"schools",schoolA,"members","classA"),{active:true,roles:["class_teacher"]});
 });
 const admin=env.authenticatedContext("adminA").firestore();
 const viewer=env.authenticatedContext("viewerA").firestore();
 const teacher=env.authenticatedContext("teacherA").firestore();
 const root=env.authenticatedContext("root").firestore();
 const subject=env.authenticatedContext("teacherA").firestore();
 const classTeacher=env.authenticatedContext("classA").firestore();
 const outsider=env.authenticatedContext("outsider").firestore();
 const studentA=doc(admin,"schools",schoolA,"students","student1");
 await assertSucceeds(getDoc(studentA));
 await assertSucceeds(setDoc(studentA,{name:"Synthetic Updated",classId:"9",schoolId:schoolA}));
 await assertFails(setDoc(studentA,{name:"Cross-school claim",classId:"9",schoolId:schoolB}));
 const createdStudent=doc(admin,"schools",schoolA,"students","studentCreated");
 const validStudent={schoolId:schoolA,nameEnglish:"Synthetic Student",class:"Class 9",classId:"Class 9",active:true};
 await assertSucceeds(setDoc(createdStudent,validStudent));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"students","wrongSchool"),{...validStudent,schoolId:schoolB}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"students","wrongClass"),{...validStudent,classId:"Class 10"}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"students","missingName"),{...validStudent,nameEnglish:""}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"students","unexpectedField"),{...validStudent,admin:true}));
 await assertFails(deleteDoc(studentA));
 await assertFails(getDoc(doc(admin,"schools",schoolB,"students","student1")));
 // A user enrolled in two schools may read each school independently, never write as viewer.
 await env.withSecurityRulesDisabled(async context=>{
   await setDoc(doc(context.firestore(),"schools",schoolB,"members","viewerA"),{active:true,roles:["viewer"]});
 });
 await assertSucceeds(getDoc(doc(viewer,"schools",schoolB,"students","student1")));
 await assertFails(setDoc(doc(viewer,"schools",schoolB,"students","viewer_write"),{name:"Blocked"}));
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolB,"members","viewerA"),{active:false});
 });
 await assertFails(getDoc(doc(viewer,"schools",schoolB,"students","student1")));
 await assertSucceeds(getDoc(doc(viewer,"schools",schoolA,"students","student1")));

 await assertFails(getDocs(collection(admin,"schools",schoolB,"students")));
 await assertFails(setDoc(doc(admin,"schools",schoolB,"students","student2"),{name:"No"}));
 await assertSucceeds(getDoc(doc(viewer,"schools",schoolA,"students","student1")));
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"students","student1"),{name:"No"}));
 await assertFails(setDoc(doc(teacher,"schools",schoolA,"students","student1"),{name:"No"}));
 await assertFails(getDoc(doc(outsider,"schools",schoolA,"students","student1")));
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"classes","class9"),{name:"9"}));
 await assertFails(deleteDoc(doc(admin,"schools",schoolA,"classes","class9")));
 await assertSucceeds(getDoc(doc(viewer,"schools",schoolA,"classes","class9")));
 // The isolated read-only workspace must read only the current school's collections.
 for(const kind of ["students","classes","subjects","exams"]){
   await assertSucceeds(getDocs(collection(viewer,"schools",schoolA,kind)));
   await assertSucceeds(getDocs(collection(teacher,"schools",schoolA,kind)));
   await assertFails(getDocs(collection(viewer,"schools",schoolB,kind)));
   await assertFails(getDocs(collection(outsider,"schools",schoolA,kind)));
 }

 await assertFails(setDoc(doc(viewer,"schools",schoolA,"classes","class9"),{name:"10"}));
 await assertFails(setDoc(doc(admin,"schools",schoolB,"classes","class9"),{name:"9"}));
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"school_settings","default"),{name:"School A"}));
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"school_settings","default"),{name:"Changed"}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"audit_logs","log1"),{event:"tamper"}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"user_roles","user1"),{role:"admin"}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"public_results","result1"),{published:true}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"school_gallery","photo1"),{url:"unsafe"}));

 await assertSucceeds(getDoc(doc(admin,"schools",schoolA,"members","teacherA")));
 await assertSucceeds(getDocs(collection(admin,"schools",schoolA,"members")));
 await assertFails(getDoc(doc(viewer,"schools",schoolA,"members","teacherA")));
 await assertFails(getDocs(collection(viewer,"schools",schoolA,"members")));
 await assertFails(getDoc(doc(admin,"schools",schoolB,"members","viewerB")));
 await assertFails(getDocs(collection(admin,"schools",schoolB,"members")));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"members","adminA"),{active:true,roles:["school_admin"]}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"members","newViewer"),{uid:"newViewer",schoolId:schoolA,active:true,roles:["viewer"]}));
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"invitations","newViewer"),{uid:"newViewer",schoolId:schoolA,active:true,roles:["viewer"]}));
 await assertSucceeds(setDoc(doc(env.authenticatedContext("newViewer").firestore(),"schools",schoolA,"members","newViewer"),{uid:"newViewer",schoolId:schoolA,active:true,roles:["viewer"]}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"members","newTeacher"),{uid:"newTeacher",schoolId:schoolA,active:true,roles:["subject_teacher"]}));
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"invitations","newTeacher"),{uid:"newTeacher",schoolId:schoolA,active:true,roles:["subject_teacher"]}));
 await assertSucceeds(setDoc(doc(env.authenticatedContext("newTeacher").firestore(),"schools",schoolA,"members","newTeacher"),{uid:"newTeacher",schoolId:schoolA,active:true,roles:["subject_teacher"]}));
 await assertFails(setDoc(doc(admin,"schools",schoolB,"members","outsider"),{uid:"outsider",schoolId:schoolB,active:true,roles:["viewer"]}));
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"members","viewerCreated"),{uid:"viewerCreated",schoolId:schoolA,active:true,roles:["viewer"]}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"members","newAdmin"),{uid:"newAdmin",schoolId:schoolA,active:true,roles:["school_admin"]}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"members","newMixed"),{uid:"newMixed",schoolId:schoolA,active:true,roles:["viewer","subject_teacher"]}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"members","newTeacher"),{uid:"newTeacher",schoolId:schoolA,active:true,roles:["school_admin"]}));
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"members","newViewer"),{uid:"newViewer",schoolId:schoolA,active:false,roles:["viewer"]}));
 await assertFails(getDoc(doc(env.authenticatedContext("newViewer").firestore(),"schools",schoolA,"students","student1")));
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"members","newViewer"),{uid:"newViewer",schoolId:schoolA,active:true,roles:["viewer"]}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"members","newViewer"),{uid:"newViewer",schoolId:schoolA,active:false,roles:["school_admin"]}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"members","adminA"),{active:false,roles:["school_admin"]}));
 await assertFails(setDoc(doc(admin,"schools",schoolB,"members","viewerB"),{uid:"viewerB",schoolId:schoolB,active:false,roles:["viewer"]}));
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"members","newViewer"),{uid:"newViewer",schoolId:schoolA,active:true,roles:["viewer"]}));
 const invitation={uid:"invitedTeacher",schoolId:schoolA,roles:["subject_teacher"],active:true};
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"invitations","invitedTeacher"),invitation));
 await assertFails(setDoc(doc(admin,"schools",schoolB,"invitations","invitedTeacher"),invitation));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"invitations","invitedTeacher"),{...invitation,roles:["school_admin"]}));
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"invitations","invitedTeacher"),invitation));
 const invited=env.authenticatedContext("invitedTeacher").firestore();
 await assertSucceeds(getDoc(doc(invited,"schools",schoolA,"invitations","invitedTeacher")));
 await assertFails(getDoc(doc(viewer,"schools",schoolA,"invitations","invitedTeacher")));
 await assertFails(setDoc(doc(invited,"schools",schoolA,"members","invitedTeacher"),{...invitation,roles:["school_admin"]}));
 await assertSucceeds(setDoc(doc(invited,"schools",schoolA,"members","invitedTeacher"),invitation));
 await assertFails(setDoc(doc(invited,"schools",schoolB,"members","invitedTeacher"),{...invitation,schoolId:schoolB}));
 const assignment={uid:"newTeacher",schoolId:schoolA,classId:"9",kind:"subject_teacher",active:true,terms:["first","final"]};
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"assignments","newTeacher_9_computer"),{...assignment,subjectId:"computer"}));
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"assignments","viewer_9"),{...assignment,uid:"viewerA"}));
 await assertFails(setDoc(doc(admin,"schools",schoolB,"assignments","newTeacher_9"),{...assignment,schoolId:schoolB}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"assignments","viewer_9"),{...assignment,uid:"newViewer"}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"assignments","admin_9"),{...assignment,uid:"adminA"}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"assignments","badTerm"),{...assignment,terms:["fourth"]}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"assignments","newTeacher_9"),{...assignment,classId:"10"}));
 const assignedSubject=env.authenticatedContext("newTeacher").firestore();
 const assignedMark={schoolId:schoolA,classId:"9",subjectId:"computer",studentId:"student1",term:"first",score:32};
 await assertFails(setDoc(doc(admin,"schools",schoolA,"assignments","newTeacher_9_wrong"),{...assignment,subjectId:"computer"}));
 await assertSucceeds(setDoc(doc(assignedSubject,"schools",schoolA,"marks","assigned_m1"),assignedMark));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"marks","missing_subject"),{...assignedMark,subjectId:"nonexistent"}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"marks","other_school_subject"),{...assignedMark,subjectId:"schoolB_only"}));
 await assertFails(deleteDoc(doc(admin,"schools",schoolA,"subjects","computer")));
 await assertFails(setDoc(doc(assignedSubject,"schools",schoolA,"marks","assigned_m2"),{...assignedMark,subjectId:"math"}));
 await assertFails(setDoc(doc(assignedSubject,"schools",schoolA,"marks","wrong_class_student"),{...assignedMark,classId:"10"}));
 await assertFails(setDoc(doc(assignedSubject,"schools",schoolA,"marks","assigned_m3"),{...assignedMark,term:"second"}));
 await assertFails(setDoc(doc(assignedSubject,"schools",schoolB,"marks","assigned_m4"),{...assignedMark,schoolId:schoolB}));
 const subjectAssignmentRef=doc(admin,"schools",schoolA,"assignments","newTeacher_9_computer");
 await assertFails(updateDoc(doc(assignedSubject,"schools",schoolA,"assignments","newTeacher_9_computer"),{active:false}));
 await assertFails(updateDoc(doc(viewer,"schools",schoolA,"assignments","newTeacher_9_computer"),{active:false}));
 await assertFails(updateDoc(doc(admin,"schools",schoolB,"assignments","newTeacher_9_computer"),{active:false}));
 await assertFails(updateDoc(subjectAssignmentRef,{classId:"10"}));
 await assertFails(deleteDoc(subjectAssignmentRef));
 await assertSucceeds(updateDoc(subjectAssignmentRef,{active:false}));
 await assertFails(setDoc(doc(assignedSubject,"schools",schoolA,"marks","assigned_revoked"),assignedMark));
 await assertSucceeds(updateDoc(subjectAssignmentRef,{active:true}));
 await assertSucceeds(setDoc(doc(assignedSubject,"schools",schoolA,"marks","assigned_restored"),assignedMark));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"members","newClassTeacher"),{uid:"newClassTeacher",schoolId:schoolA,active:true,roles:["class_teacher"]}));
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"invitations","newClassTeacher"),{uid:"newClassTeacher",schoolId:schoolA,active:true,roles:["class_teacher"]}));
 await assertSucceeds(setDoc(doc(env.authenticatedContext("newClassTeacher").firestore(),"schools",schoolA,"members","newClassTeacher"),{uid:"newClassTeacher",schoolId:schoolA,active:true,roles:["class_teacher"]}));
 const classAssignment={uid:"newClassTeacher",schoolId:schoolA,classId:"9",kind:"class_teacher",active:true,terms:["first","final"]};
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"assignments","newClassTeacher_9"),classAssignment));
 const assignedClassTeacher=env.authenticatedContext("newClassTeacher").firestore();
 const assignedAttendance={schoolId:schoolA,classId:"9",studentId:"student1",term:"first",present:true};
 await assertSucceeds(setDoc(doc(assignedClassTeacher,"schools",schoolA,"attendance","assigned_a1"),assignedAttendance));
 await assertFails(setDoc(doc(assignedClassTeacher,"schools",schoolA,"attendance","assigned_a2"),{...assignedAttendance,classId:"10"}));
 await assertFails(setDoc(doc(assignedClassTeacher,"schools",schoolA,"attendance","wrong_class_student"),{...assignedAttendance,classId:"10"}));
 await assertFails(setDoc(doc(assignedClassTeacher,"schools",schoolA,"attendance","assigned_a3"),{...assignedAttendance,term:"second"}));
 await assertFails(setDoc(doc(assignedClassTeacher,"schools",schoolB,"attendance","assigned_a4"),{...assignedAttendance,schoolId:schoolB}));
 await assertFails(setDoc(doc(assignedClassTeacher,"schools",schoolA,"marks","assigned_class_mark"),{schoolId:schoolA,classId:"9",subjectId:"computer",studentId:"student1",term:"first",score:30}));
 await assertFails(setDoc(doc(root,"schools","school_C001"),{name:"No direct client onboarding"}));
 await assertSucceeds(getDoc(doc(root,"schools",schoolA)));
 await assertFails(getDoc(doc(root,"schools",schoolA,"students","student1")));
 const mark={schoolId:schoolA,classId:"9",subjectId:"computer",studentId:"student1",term:"first",score:30};
 await assertSucceeds(setDoc(doc(subject,"schools",schoolA,"marks","m1"),mark));
 await assertSucceeds(getDoc(doc(viewer,"schools",schoolA,"marks","m1")));
 await assertFails(deleteDoc(doc(admin,"schools",schoolA,"marks","m1")));
 await assertFails(deleteDoc(doc(subject,"schools",schoolA,"marks","m1")));
 await assertFails(deleteDoc(doc(viewer,"schools",schoolA,"marks","m1")));
 await assertFails(updateDoc(doc(subject,"schools",schoolA,"marks","m1"),{subjectId:"math"}));
 await assertFails(updateDoc(doc(admin,"schools",schoolA,"marks","m1"),{studentId:"student2"}));
 await assertFails(updateDoc(doc(viewer,"schools",schoolA,"marks","m1"),{score:35}));
 await assertFails(getDoc(doc(outsider,"schools",schoolA,"marks","m1")));
 await assertFails(getDoc(doc(admin,"schools",schoolB,"marks","m1")));
 await assertFails(getDocs(collection(admin,"schools",schoolB,"marks")));
 await assertFails(getDoc(doc(root,"schools",schoolA,"marks","m1")));
 await assertFails(setDoc(doc(subject,"schools",schoolB,"marks","m1"),{...mark,schoolId:schoolB}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m2"),{...mark,subjectId:"math"}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m_missing"),{...mark,studentId:"unknown"}));
 // School admin has write permission, but cannot assign marks to a student from another class.
 await assertFails(setDoc(doc(admin,"schools",schoolA,"marks","admin_wrong_class"),{...mark,classId:"10"}));
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"marks","m3"),mark));
 await assertFails(setDoc(doc(outsider,"schools",schoolA,"marks","m4"),mark));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m3"),{...mark,term:"second"}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m3"),{...mark,schoolId:schoolB}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m3"),{...mark,score:"30"}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m3"),{...mark,extraField:"unsafe"}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m1"),{...mark,classId:"10"}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m1"),{...mark,score:-1}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m1"),{...mark,score:101}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m1"),{...mark,studentId:"student2"}));
 const attendance={schoolId:schoolA,classId:"9",studentId:"student1",term:"first",present:true};
 await assertSucceeds(setDoc(doc(classTeacher,"schools",schoolA,"attendance","a1"),attendance));
 await assertSucceeds(getDoc(doc(viewer,"schools",schoolA,"attendance","a1")));
 await assertFails(deleteDoc(doc(admin,"schools",schoolA,"attendance","a1")));
 await assertFails(deleteDoc(doc(classTeacher,"schools",schoolA,"attendance","a1")));
 await assertFails(deleteDoc(doc(viewer,"schools",schoolA,"attendance","a1")));
 await assertFails(updateDoc(doc(classTeacher,"schools",schoolA,"attendance","a1"),{classId:"10"}));
 await assertFails(updateDoc(doc(admin,"schools",schoolA,"attendance","a1"),{studentId:"student2"}));
 await assertFails(updateDoc(doc(viewer,"schools",schoolA,"attendance","a1"),{present:false}));
 await assertFails(getDoc(doc(outsider,"schools",schoolA,"attendance","a1")));
 await assertFails(getDoc(doc(admin,"schools",schoolB,"attendance","a1")));
 await assertFails(getDocs(collection(admin,"schools",schoolB,"attendance")));
 await assertFails(getDoc(doc(root,"schools",schoolA,"attendance","a1")));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"attendance","a2"),attendance));
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"attendance","a3"),attendance));
 await assertFails(setDoc(doc(outsider,"schools",schoolA,"attendance","a3"),attendance));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","a3"),{...attendance,term:"second"}));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","a3"),{...attendance,present:"true"}));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolB,"attendance","a4"),{...attendance,schoolId:schoolB}));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","a_missing"),{...attendance,studentId:"unknown"}));
 // Same class integrity requirement applies even to school-admin attendance writes.
 await assertFails(setDoc(doc(admin,"schools",schoolA,"attendance","admin_wrong_class"),{...attendance,classId:"10"}));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","a1"),{...attendance,studentId:"student2"}));
 // A class transfer must immediately revoke writes to the student's old class.
 // Use an isolated synthetic student so the rest of the test fixtures stay intact.
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"students","transferredStudent"),{name:"Transfer Fixture",classId:"9"}));
 const transferMark={...mark,studentId:"transferredStudent"};
 const transferAttendance={...attendance,studentId:"transferredStudent"};
 await assertSucceeds(setDoc(doc(subject,"schools",schoolA,"marks","transfer_before"),transferMark));
 await assertSucceeds(setDoc(doc(classTeacher,"schools",schoolA,"attendance","transfer_before"),transferAttendance));
 await assertSucceeds(updateDoc(doc(admin,"schools",schoolA,"students","transferredStudent"),{classId:"10"}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","transfer_after"),transferMark));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","transfer_after"),transferAttendance));

 await env.withSecurityRulesDisabled(async context=>{
   const db=context.firestore();
   await setDoc(doc(db,"schools",schoolA,"members","teacherA"),{active:false,roles:["subject_teacher"]});
   await setDoc(doc(db,"schools",schoolA,"members","classA"),{active:false,roles:["class_teacher"]});
 });
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m5"),mark));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","a5"),attendance));
 await env.withSecurityRulesDisabled(async context=>{
   await setDoc(doc(context.firestore(),"schools",schoolA),{name:schoolA,status:"suspended"});
 });
 await assertFails(getDoc(doc(admin,"schools",schoolA,"students","student1")));
 await assertFails(getDoc(doc(viewer,"schools",schoolA,"students","student1")));
 // A suspended school must not admit an invited user, even with a valid invitation.
 await env.withSecurityRulesDisabled(async context=>{
   await setDoc(doc(context.firestore(),"schools",schoolA,"invitations","suspendedInvite"),{uid:"suspendedInvite",schoolId:schoolA,roles:["viewer"],active:true});
 });
 const suspendedInvite=env.authenticatedContext("suspendedInvite").firestore();
 await assertFails(setDoc(doc(suspendedInvite,"schools",schoolA,"members","suspendedInvite"),{uid:"suspendedInvite",schoolId:schoolA,roles:["viewer"],active:true}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"students","student2"),{name:"Blocked"}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m6"),mark));
 // Suspending school A must not disable independent school B.
 await env.withSecurityRulesDisabled(async context=>{
   await setDoc(doc(context.firestore(),"schools",schoolB,"members","adminB"),{active:true,roles:["school_admin"]});
 });
 const otherAdmin=env.authenticatedContext("adminB").firestore();
 await assertSucceeds(getDoc(doc(otherAdmin,"schools",schoolB,"students","student1")));
 await assertSucceeds(setDoc(doc(otherAdmin,"schools",schoolB,"students","student2"),{name:"Independent School"}));
 await assertFails(getDoc(doc(otherAdmin,"schools",schoolA,"students","student1")));

 await assertSucceeds(getDoc(doc(root,"schools",schoolA)));
 await env.withSecurityRulesDisabled(async context=>{
   await setDoc(doc(context.firestore(),"schools",schoolA),{name:schoolA,status:"pending"});
 });
 await assertFails(getDoc(doc(admin,"schools",schoolA,"students","student1")));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"school_settings","default"),{name:"Blocked Pending"}));
 await env.withSecurityRulesDisabled(async context=>{
   await setDoc(doc(context.firestore(),"schools",schoolA),{name:schoolA,status:"active"});
 });
 await assertSucceeds(getDoc(doc(admin,"schools",schoolA,"students","student1")));
 await assertSucceeds(getDoc(doc(viewer,"schools",schoolA,"students","student1")));
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"students","student1"),{name:"Still Read Only"}));
 // Membership revocation must immediately block access without affecting other schools.
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","viewerA"),{active:false});
 });
 await assertFails(getDoc(doc(viewer,"schools",schoolA,"students","student1")));
 await assertFails(getDoc(doc(viewer,"schools",schoolA,"marks","m1")));
 await assertSucceeds(getDoc(doc(admin,"schools",schoolA,"students","student1")));
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","viewerA"),{active:true});
 });
 await assertSucceeds(getDoc(doc(viewer,"schools",schoolA,"students","student1")));

 // Revoking teacher access must immediately block assigned marks writes.
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","teacherA"),{active:false});
 });
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","revoked_teacher"),mark));
 await assertFails(getDoc(doc(subject,"schools",schoolA,"students","student1")));
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","teacherA"),{active:true});
 });
 await assertSucceeds(getDoc(doc(subject,"schools",schoolA,"students","student1")));
 // Revoking admin access must immediately block school reads and writes.
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","adminA"),{active:false});
 });
 await assertFails(getDoc(doc(admin,"schools",schoolA,"students","student1")));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"students","revoked_admin"),{name:"Blocked",classId:"9"}));
 await assertSucceeds(getDoc(doc(viewer,"schools",schoolA,"students","student1")));
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","adminA"),{active:true});
 });
 await assertSucceeds(getDoc(doc(admin,"schools",schoolA,"students","student1")));

 // A mixed viewer and teacher role must never gain marks-writing privileges.
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","teacherA"),{roles:["viewer","subject_teacher"]});
 });
 await assertSucceeds(getDoc(doc(subject,"schools",schoolA,"marks","m1")));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","mixed_role_blocked"),mark));
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","teacherA"),{roles:["subject_teacher"]});
 });
 await assertSucceeds(setDoc(doc(subject,"schools",schoolA,"marks","teacher_restored"),mark));

 // A mixed viewer and admin role must never grant school data writes.
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","adminA"),{roles:["viewer","school_admin"]});
 });
 await assertSucceeds(getDoc(doc(admin,"schools",schoolA,"students","student1")));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"students","mixed_admin_blocked"),{name:"Blocked",classId:"9"}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"marks","mixed_admin_mark"),mark));
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","adminA"),{roles:["school_admin"]});
 });
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"students","admin_restored"),{...validStudent,nameEnglish:"Restored"}));

 // Restore the synthetic class teacher disabled by an earlier revocation scenario.
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","classA"),{active:true});
 });
 // Viewer role overrides a valid class teacher attendance assignment.
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","classA"),{roles:["viewer","class_teacher"]});
 });
 await assertSucceeds(getDoc(doc(classTeacher,"schools",schoolA,"attendance","a1")));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","mixed_class_blocked"),attendance));
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","classA"),{roles:["class_teacher"]});
 });
 await assertSucceeds(setDoc(doc(classTeacher,"schools",schoolA,"attendance","class_restored"),attendance));

 // A revoked class teacher cannot write attendance, even with an active assignment.
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","classA"),{active:false});
 });
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","revoked_class"),attendance));
 await assertFails(getDoc(doc(classTeacher,"schools",schoolA,"attendance","a1")));
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"members","classA"),{active:true});
 });
 await assertSucceeds(getDoc(doc(classTeacher,"schools",schoolA,"attendance","a1")));

 // Disabling the class assignment blocks attendance writes without removing membership.
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"assignments","classA_9"),{active:false});
 });
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","inactive_assignment"),attendance));
 await assertSucceeds(getDoc(doc(classTeacher,"schools",schoolA,"attendance","a1")));
 await env.withSecurityRulesDisabled(async context=>{
   await updateDoc(doc(context.firestore(),"schools",schoolA,"assignments","classA_9"),{active:true});
 });
 await assertSucceeds(setDoc(doc(classTeacher,"schools",schoolA,"attendance","active_assignment"),attendance));

 console.log("V47 tenant Firestore emulator isolation and exam assignment tests passed");
} finally {await env.cleanup();}
