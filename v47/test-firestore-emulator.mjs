import {loadSparkDraftReport} from './spark-draft-report.mjs';
import {saveTeacherClassAttendance} from './teacher-class-attendance.mjs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
import {doc,getDoc,setDoc,updateDoc,deleteDoc,deleteField,collection,getDocs,serverTimestamp,runTransaction,getDocFromServer,getDocsFromServer,query,where,orderBy,limit,startAfter} from 'firebase/firestore';
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId:'smss-v47-emulator-tests',firestore:{rules,host:'127.0.0.1',port:8187}});
const db=(uid)=>env.authenticatedContext(uid).firestore();
const anon=env.unauthenticatedContext().firestore();
const student=(database,sid)=>doc(database,'schools',sid,'students','student_1');
const mark=(database,sid)=>doc(database,'schools',sid,'marks','final:student_1:math');
const attendance=(database,sid)=>doc(database,'schools',sid,'attendance','2026-11-18_student_1');
try{
 await env.withSecurityRulesDisabled(async context=>{
  const admin=context.firestore();
  await setDoc(doc(admin,'v47_super_admins','root_super'),{active:true});
  for(const sid of ['12345678','87654321']){
   await setDoc(doc(admin,'schools',sid),{id:sid,name:'School '+sid,iemisCode:sid,active:true});
   for(const [uid,role,active] of [['admin_'+sid,'school_admin',true],['teacher_'+sid,'teacher',true],['viewer_'+sid,'viewer',true],['inactive_'+sid,'viewer',false]]){
    await setDoc(doc(admin,'schools',sid,'members',uid),{uid,schoolId:sid,role,active});
   }
   await setDoc(doc(admin,'schools',sid,'students','student_1'),{name:'Student',class:'10',schoolId:sid});
   await setDoc(doc(admin,'schools',sid,'subjects','math'),{schoolId:sid,name:'Mathematics',class:'10',active:true});
   await setDoc(doc(admin,'schools',sid,'subject_assignments','student_1:math'),{schoolId:sid,studentId:'student_1',subjectId:'math',class:'10'});
   await setDoc(doc(admin,'schools',sid,'marks','final:student_1:math'),{schoolId:sid,studentId:'student_1',subjectId:'math',class:'10',term:'final',theory:10,practical:0});
   await setDoc(doc(admin,'schools',sid,'attendance','2026-11-18_student_1'),{schoolId:sid,studentId:'student_1',class:'10',date:'2026-11-18',present:true});
   // CDC per-student evidence is read-only until its full V46 schema is reviewed.
   await setDoc(doc(admin,'schools',sid,'cdc_observations','obs_1'),{schoolId:sid,studentId:'student_1',subject:'math',period:'final',level:'Achieved'});
  }
  await setDoc(doc(admin,'schools','11223344'),{id:'11223344',name:'Inactive School',iemisCode:'11223344',active:false});
  await setDoc(doc(admin,'schools','11223344','members','viewer_12345678'),{uid:'viewer_12345678',schoolId:'11223344',role:'viewer',active:true});
  await setDoc(doc(admin,'schools','12345678','members','forged_user'),{uid:'someone_else',schoolId:'12345678',role:'viewer',active:true});
 });
 const viewer=db('viewer_12345678'),teacher=db('teacher_12345678'),admin=db('admin_12345678'),superDb=db('root_super');
 // Activity telemetry is a narrow self-only exception, not academic permission.
 const activity=(db,sid,uid)=>doc(db,'schools',sid,'dashboard_activity',uid);
 const activityPayload=(sid,uid)=>({schoolId:sid,uid,lastSeen:serverTimestamp()});
 const self=activity(viewer,'12345678','viewer_12345678');
 await assertSucceeds(setDoc(self,activityPayload('12345678','viewer_12345678')));
 await assertFails(setDoc(self,activityPayload('12345678','viewer_12345678'))); // rate limit
 await assertFails(setDoc(activity(viewer,'12345678','teacher_12345678'),activityPayload('12345678','teacher_12345678')));
 await assertFails(setDoc(activity(viewer,'87654321','viewer_12345678'),activityPayload('87654321','viewer_12345678')));
 await assertFails(setDoc(activity(anon,'12345678','viewer_12345678'),activityPayload('12345678','viewer_12345678')));
 await assertFails(setDoc(activity(teacher,'12345678','teacher_12345678'),{...activityPayload('12345678','teacher_12345678'),role:'school_admin'}));
 await assertFails(setDoc(activity(teacher,'12345678','teacher_12345678'),{schoolId:'12345678',uid:'teacher_12345678',lastSeen:new Date()}));
 await assertFails(getDocs(collection(viewer,'schools','12345678','dashboard_activity')));
 await assertFails(getDocs(collection(db('admin_87654321'),'schools','12345678','dashboard_activity')));
 await assertSucceeds(getDocs(collection(admin,'schools','12345678','dashboard_activity')));
 await assertFails(deleteDoc(self));
 await env.withSecurityRulesDisabled(async context=>{
  await setDoc(activity(context.firestore(),'12345678','viewer_12345678'),{schoolId:'12345678',uid:'viewer_12345678',lastSeen:new Date(Date.now()-16*60*1000)});
 });
 await assertSucceeds(setDoc(self,activityPayload('12345678','viewer_12345678')));
 // Actual Spark Web SDK private draft report with synthetic primary school data.
 const reportSid='12345678',reportUid='admin_12345678',reportId='1_reportmath_final';
 await env.withSecurityRulesDisabled(async ctx=>{
  const f=ctx.firestore(),root=['schools',reportSid];
  await setDoc(doc(f,...root,'students','report_s1'),{schoolId:reportSid,class:'1',name:'Report Student',active:true});
  await setDoc(doc(f,...root,'subjects','reportmath'),{schoolId:reportSid,class:'1',name:'Mathematics',creditHour:4,active:true});
  await setDoc(doc(f,...root,'mark_settings',reportId),{id:reportId,schoolId:reportSid,classId:'1',subjectId:'reportmath',examId:'final',active:true,components:[{key:'count',name:'No. of Learning Achievement',fullMarks:5},{key:'got',name:'Obtained Learning Achievement',fullMarks:20}]});
  await setDoc(doc(f,...root,'class_mark_drafts',reportId),{format:'smss-v47-complete-class-draft-v1',state:'draft',schoolId:reportSid,classId:'1',subjectId:'reportmath',examId:'final',settingsId:reportId,rosterCount:1,revision:1,updatedBy:reportUid,updatedAt:serverTimestamp(),entries:[{studentId:'report_s1',isAbsent:false,values:{count:5,got:18},totalObtained:23}]});
 });
 const reportArgs={db:admin,api:{doc,getDocFromServer,getDocsFromServer,collection,query,where,orderBy,limit,startAfter,runTransaction},
  auth:{currentUser:{uid:reportUid}},actor:{uid:reportUid,role:'school_admin',schoolId:reportSid,active:true},schoolId:reportSid,classNo:'1',term:'final',assertCurrent:()=>{}};
 const preview=await loadSparkDraftReport(reportArgs);
 if(preview.summary.rows[0].gpa!==4||preview.publicationAllowed!==false||!preview.draftPreview)throw Error('Private Spark report GPA or preview guard incorrect');
 await assertFails(getDoc(doc(viewer,'schools',reportSid,'class_mark_drafts',reportId)));
 await assertFails(getDoc(doc(db('admin_87654321'),'schools',reportSid,'class_mark_drafts',reportId)));
 console.log('PASS actual Web SDK Spark private draft report and cross-school/Viewer deny');
 // 1 Anonymous reads denied
 await assertFails(getDoc(student(anon,'12345678')));
 // 2 Anonymous writes denied
 await assertFails(setDoc(student(anon,'12345678'),{name:'bad'}));
 // 3 Active viewer reads own school
 await assertSucceeds(getDoc(student(viewer,'12345678')));
 // 4 Cross-school read denied
 await assertFails(getDoc(student(viewer,'87654321')));
 // 5 Cross-school write denied
 await assertFails(setDoc(student(admin,'87654321'),{name:'bad'}));
 // 6 Viewer writes denied
 await assertFails(updateDoc(student(viewer,'12345678'),{name:'bad'}));
 // 7 Teacher marks write denied until assignment rules implemented
 await assertFails(updateDoc(mark(teacher,'12345678'),{theory:30}));
 // 8 Teacher attendance write denied
 await assertFails(updateDoc(attendance(teacher,'12345678'),{present:false}));
 // 9 School admin can update own marks
 await assertFails(updateDoc(mark(admin,'12345678'),{theory:30}));
 // 10 School admin cannot delete
 await assertFails(deleteDoc(mark(admin,'12345678')));
 // 11 Inactive membership denied
 await assertFails(getDoc(student(db('inactive_12345678'),'12345678')));
 // 12 Inactive school denied
 await assertFails(getDoc(doc(viewer,'schools','11223344','students','student_1')));
 // 13 Forged uid membership denied
 await assertFails(getDoc(student(db('forged_user'),'12345678')));
 // 14 Super Admin can create only inactive school
 await assertSucceeds(setDoc(doc(superDb,'schools','22334455'),{id:'22334455',name:'New School',iemisCode:'22334455',active:false}));
 await assertFails(setDoc(doc(superDb,'schools','33445566'),{id:'33445566',name:'Bad School',iemisCode:'33445566',active:true}));
 // 15 Self-provision Super Admin denied
 await assertFails(setDoc(doc(viewer,'v47_super_admins','viewer_12345678'),{active:true}));
 // 16 Arbitrary nested paths denied
 await assertFails(getDoc(doc(viewer,'schools','12345678','students','student_1','private','x')));
 // 17 Cross-school query denied
 await assertFails(getDocs(collection(viewer,'schools','87654321','students')));
 // 18 Own-school query allowed
 await assertSucceeds(getDocs(collection(viewer,'schools','12345678','students')));
 // CDC observations must remain private to their school and fully read-only
 // even to School Admin until the assessment-write contract is reviewed.
 const ownCdc=doc(viewer,'schools','12345678','cdc_observations','obs_1');
 await assertSucceeds(getDoc(ownCdc));
 await assertSucceeds(getDocs(collection(teacher,'schools','12345678','cdc_observations')));
 await assertFails(getDoc(doc(viewer,'schools','87654321','cdc_observations','obs_1')));
 await assertFails(getDoc(doc(anon,'schools','12345678','cdc_observations','obs_1')));
 await assertFails(setDoc(doc(admin,'schools','12345678','cdc_observations','new_observation'),{schoolId:'12345678',studentId:'student_1'}));
 await assertFails(updateDoc(doc(admin,'schools','12345678','cdc_observations','obs_1'),{level:'Changed'}));
 await assertFails(deleteDoc(doc(admin,'schools','12345678','cdc_observations','obs_1')));
 await assertFails(setDoc(doc(viewer,'schools','12345678','cdc_observations','new_observation'),{schoolId:'12345678'}));
 // 19 Unauthorized school listing denied
 await assertFails(getDocs(collection(viewer,'schools')));
 // 20 Super Admin school listing allowed
 await assertSucceeds(getDocs(collection(superDb,'schools')));
 // 21 Teacher can read own marks
 await assertSucceeds(getDoc(mark(teacher,'12345678')));
 // 22 Viewer cannot write marks
 await assertFails(updateDoc(mark(viewer,'12345678'),{theory:99}));
 // 23 Viewer cannot write attendance
 await assertFails(updateDoc(attendance(viewer,'12345678'),{present:false}));
 // 24 Teacher cannot edit student details
 await assertFails(updateDoc(student(teacher,'12345678'),{name:'Changed'}));
 // 25 School admin can update own attendance
 await assertSucceeds(updateDoc(attendance(admin,'12345678'),{present:false}));
 // 26 School admin cannot remove student
 await assertFails(deleteDoc(student(admin,'12345678')));
 // 27 School admin cannot change membership roles
 await assertFails(updateDoc(doc(admin,'schools','12345678','members','viewer_12345678'),{role:'school_admin'}));
 // 28 Viewer cannot list memberships
 await assertFails(getDocs(collection(viewer,'schools','12345678','members')));
 // 29 School admin can list own memberships
 await assertSucceeds(getDocs(collection(admin,'schools','12345678','members')));
 // 30 School admin cannot list other school's memberships
 await assertFails(getDocs(collection(admin,'schools','87654321','members')));
 // 31 Viewer cannot create arbitrary collection documents
 await assertFails(setDoc(doc(viewer,'schools','12345678','private','x'),{secret:true}));
 // 32 Viewer cannot write own membership
 await assertFails(updateDoc(doc(viewer,'schools','12345678','members','viewer_12345678'),{role:'school_admin'}));
 // 33 Teacher cannot read another school's marks
 await assertFails(getDoc(mark(teacher,'87654321')));
 // 34 Teacher cannot read another school's attendance
 await assertFails(getDoc(attendance(teacher,'87654321')));
 // 35 School admin cannot create active school
 await assertFails(setDoc(doc(admin,'schools','44556677'),{id:'44556677',name:'Admin New',iemisCode:'44556677',active:false}));
 // 36 Super Admin cannot delete school
 await assertFails(deleteDoc(doc(superDb,'schools','12345678')));
 // 37 Super Admin can activate a school
 await assertSucceeds(updateDoc(doc(superDb,'schools','22334455'),{active:true}));
 // 38 Super Admin cannot alter school ID on update
 await assertFails(updateDoc(doc(superDb,'schools','12345678'),{id:'87654321'}));
 // 39 Anonymous school listing denied
 await assertFails(getDocs(collection(anon,'schools')));
 // 40 Viewer cannot read Super Admin registry
 await assertFails(getDoc(doc(viewer,'v47_super_admins','root_super')));
 // 41 School admin can read school registry entry
 await assertSucceeds(getDoc(doc(admin,'schools','12345678')));
 // 42 School admin cannot read other school registry entry
 await assertFails(getDoc(doc(admin,'schools','87654321')));
 // 43 Viewer cannot delete marks
 await assertFails(deleteDoc(mark(viewer,'12345678')));
 // 44 Teacher cannot delete attendance
 await assertFails(deleteDoc(attendance(teacher,'12345678')));
 // 45 School admin can create own student
 await assertSucceeds(setDoc(doc(admin,'schools','12345678','students','student_2'),{name:'New Student',class:'10',schoolId:'12345678'}));
 // 46 School admin cannot create student in other school
 await assertFails(setDoc(doc(admin,'schools','87654321','students','student_2'),{name:'Bad',class:'10',schoolId:'87654321'}));
 // 47 Viewer can read own attendance
 await assertSucceeds(getDoc(attendance(viewer,'12345678')));
 // 48 Viewer cannot read another school's attendance
 await assertFails(getDoc(attendance(viewer,'87654321')));
 // 49 Teacher cannot create marks without assignment authorization
 await assertFails(setDoc(doc(teacher,'schools','12345678','marks','mark_2'),{value:45}));
 // 50 School admin cannot delete staff
 await assertFails(deleteDoc(doc(admin,'schools','12345678','staff','staff_1')));
 // 51 School admin can create inactive teacher
 await assertSucceeds(setDoc(doc(admin,'schools','12345678','members','new_teacher_A'),{uid:'new_teacher_A',schoolId:'12345678',role:'teacher',active:false}));
 // 52 School admin can activate that teacher
 await assertSucceeds(updateDoc(doc(admin,'schools','12345678','members','new_teacher_A'),{active:true}));
 // 53 School admin can create inactive viewer
 await assertSucceeds(setDoc(doc(admin,'schools','12345678','members','new_viewer_A'),{uid:'new_viewer_A',schoolId:'12345678',role:'viewer',active:false}));
 // 54 School admin cannot create another school admin
 await assertFails(setDoc(doc(admin,'schools','12345678','members','evil_admin'),{uid:'evil_admin',schoolId:'12345678',role:'school_admin',active:false}));
 // 55 School admin cannot create an active teacher directly
 await assertFails(setDoc(doc(admin,'schools','12345678','members','active_teacher'),{uid:'active_teacher',schoolId:'12345678',role:'teacher',active:true}));
 // 56 School admin cannot change teacher to school admin
 await assertFails(updateDoc(doc(admin,'schools','12345678','members','new_teacher_A'),{role:'school_admin'}));
 // 57 School admin cannot edit another school's memberships
 await assertFails(updateDoc(doc(admin,'schools','87654321','members','viewer_87654321'),{active:false}));
 // 58 School admin cannot edit own membership
 await assertFails(updateDoc(doc(admin,'schools','12345678','members','admin_12345678'),{active:false}));
 // 59 Viewer cannot create a membership
 await assertFails(setDoc(doc(viewer,'schools','12345678','members','viewer_created'),{uid:'viewer_created',schoolId:'12345678',role:'viewer',active:false}));
 // 60 School admin cannot delete a teacher membership
 await assertFails(deleteDoc(doc(admin,'schools','12345678','members','new_teacher_A')));
 // 61 School admin cannot assign a different uid inside membership
 await assertFails(setDoc(doc(admin,'schools','12345678','members','uid_mismatch'),{uid:'other_uid',schoolId:'12345678',role:'viewer',active:false}));
 // 62 School admin cannot forge membership schoolId
 await assertFails(setDoc(doc(admin,'schools','12345678','members','wrong_school'),{uid:'wrong_school',schoolId:'87654321',role:'viewer',active:false}));
 // 63 School admin cannot assign super_admin role
 await assertFails(setDoc(doc(admin,'schools','12345678','members','new_super'),{uid:'new_super',schoolId:'12345678',role:'super_admin',active:false}));
 // 64 School admin cannot change teacher uid
 await assertFails(updateDoc(doc(admin,'schools','12345678','members','new_teacher_A'),{uid:'changed_uid'}));
 // 65 School admin cannot change teacher schoolId
 await assertFails(updateDoc(doc(admin,'schools','12345678','members','new_teacher_A'),{schoolId:'87654321'}));
 // 66 School admin cannot add unexpected fields
 await assertFails(updateDoc(doc(admin,'schools','12345678','members','new_teacher_A'),{permissions:['all']}));
 // 67 Teacher cannot activate own membership
 await assertFails(updateDoc(doc(teacher,'schools','12345678','members','teacher_12345678'),{active:false}));
 // 68 Viewer cannot deactivate own membership
 await assertFails(updateDoc(doc(viewer,'schools','12345678','members','viewer_12345678'),{active:false}));
 // 69 School admin can deactivate own school's teacher
 await assertSucceeds(updateDoc(doc(admin,'schools','12345678','members','new_teacher_A'),{active:false}));
 // 70 Deactivated teacher membership loses access
 await assertFails(getDoc(student(db('new_teacher_A'),'12345678')));
 // 71 School admin cannot create a student claiming another school
 await assertFails(setDoc(doc(admin,'schools','12345678','students','forged_tenant'),{schoolId:'87654321',name:'Forged'}));
 // 72 School admin cannot reassign student to another school
 await assertFails(updateDoc(student(admin,'12345678'),{schoolId:'87654321'}));
 // 73 School admin cannot create a mark claiming another school
 await assertFails(setDoc(doc(admin,'schools','12345678','marks','forged_tenant'),{schoolId:'87654321',value:10}));
 // 74 School admin cannot reassign mark to another school
 await assertFails(updateDoc(mark(admin,'12345678'),{schoolId:'87654321'}));
 // 75 School admin cannot create attendance claiming another school
 await assertFails(setDoc(doc(admin,'schools','12345678','attendance','forged_tenant'),{schoolId:'87654321',status:'present'}));
 // 76 School admin cannot reassign attendance to another school
 await assertFails(updateDoc(attendance(admin,'12345678'),{schoolId:'87654321'}));
 // 77 School admin cannot create staff claiming another school
 await assertFails(setDoc(doc(admin,'schools','12345678','staff','forged_tenant'),{schoolId:'87654321',name:'Forged'}));
 // 78 School admin can create staff scoped to own school
 await assertSucceeds(setDoc(doc(admin,'schools','12345678','staff','scoped_staff'),{schoolId:'12345678',name:'Staff'}));
 // 79 School admin cannot reassign staff to another school
 await assertFails(updateDoc(doc(admin,'schools','12345678','staff','scoped_staff'),{schoolId:'87654321'}));
 // 80 Viewer cannot modify staff
 await assertFails(updateDoc(doc(viewer,'schools','12345678','staff','scoped_staff'),{name:'Altered'}));
 // 81 Explicit tenant identity cannot be removed from staff
 await assertFails(updateDoc(doc(admin,'schools','12345678','staff','scoped_staff'),{schoolId:null}));
 // 82 Explicit tenant identity cannot be removed using deleteField
 await assertFails(updateDoc(doc(admin,'schools','12345678','staff','scoped_staff'),{schoolId:deleteField()}));
 // 83 School admin can update staff while preserving schoolId
 await assertSucceeds(updateDoc(doc(admin,'schools','12345678','staff','scoped_staff'),{name:'Updated Staff'}));
 // 84 Staff with a different tenant cannot be created by superadmin either
 await assertFails(setDoc(doc(superDb,'schools','12345678','staff','forged_by_super'),{schoolId:'87654321',name:'Bad'}));
 // 85 School Admin creates own school's exam term with tenant identity
 await assertSucceeds(setDoc(doc(admin,'schools','12345678','exams','1st'),{schoolId:'12345678',term:'1st'}));
 // 86 School Admin can list own school's exam terms
 await assertSucceeds(getDocs(collection(admin,'schools','12345678','exams')));
 // 87 Viewer may read terms but cannot create them
 await assertSucceeds(getDoc(doc(viewer,'schools','12345678','exams','1st')));
 await assertFails(setDoc(doc(viewer,'schools','12345678','exams','2nd'),{schoolId:'12345678',term:'2nd'}));
 // 89 Teacher cannot create exam terms
 await assertFails(setDoc(doc(teacher,'schools','12345678','exams','2nd'),{schoolId:'12345678',term:'2nd'}));
 // 90 Cross-school exam create is denied
 await assertFails(setDoc(doc(admin,'schools','87654321','exams','2nd'),{schoolId:'87654321',term:'2nd'}));
 // 91 Forged tenant identity denied
 await assertFails(setDoc(doc(admin,'schools','12345678','exams','2nd'),{schoolId:'87654321',term:'2nd'}));
 // 92 Exam deletion is denied even to School Admin
 await assertFails(deleteDoc(doc(admin,'schools','12345678','exams','1st')));
 // 93 Existing exam term cannot have its tenant identity reassigned
 await assertFails(updateDoc(doc(admin,'schools','12345678','exams','1st'),{schoolId:'87654321'}));
 // 94 Other-school exam reads are denied
 await assertFails(getDocs(collection(admin,'schools','87654321','exams')));
 // 95 Unknown exam term IDs are rejected by Firestore, not just the UI
 await assertFails(setDoc(doc(admin,'schools','12345678','exams','midterm'),{schoolId:'12345678',term:'midterm'}));
 // 96 The term field must match the document ID
 await assertFails(setDoc(doc(admin,'schools','12345678','exams','2nd'),{schoolId:'12345678',term:'final'}));
 // 97 Unrecognized exam fields are rejected
 await assertFails(setDoc(doc(admin,'schools','12345678','exams','2nd'),{schoolId:'12345678',term:'2nd',examName:'Extra'}));
 // 98 Existing term cannot be edited, even by its School Admin
 await assertFails(updateDoc(doc(admin,'schools','12345678','exams','1st'),{term:'2nd'}));
 // 100-105 Assigned teacher may correct scoped marks, but not alter record identity.
 await assertSucceeds(setDoc(doc(admin,'schools','12345678','teacher_assignments','12345678:teacher_12345678:10:math'),{schoolId:'12345678',uid:'teacher_12345678',classId:'10',subjectId:'math',active:false}));
 await assertFails(updateDoc(mark(teacher,'12345678'),{theory:31}));
 await assertSucceeds(updateDoc(doc(admin,'schools','12345678','teacher_assignments','12345678:teacher_12345678:10:math'),{active:true}));
 await assertFails(updateDoc(mark(teacher,'12345678'),{theory:31}));
 await assertFails(updateDoc(mark(teacher,'12345678'),{studentId:'other_student'}));
 await assertFails(updateDoc(mark(teacher,'87654321'),{theory:32}));
 // 106-111 Assigned attendance teacher may correct presence, not identity or another tenant.
 await assertSucceeds(setDoc(doc(admin,'schools','12345678','teacher_assignments','12345678:teacher_12345678:10:attendance'),{schoolId:'12345678',uid:'teacher_12345678',classId:'10',subjectId:'attendance',active:false}));
 await assertFails(updateDoc(attendance(teacher,'12345678'),{present:true}));
 await assertSucceeds(updateDoc(doc(admin,'schools','12345678','teacher_assignments','12345678:teacher_12345678:10:attendance'),{active:true}));
 // Assigned Teacher can correct only the Present/Absent field of the right class.
 await assertSucceeds(updateDoc(attendance(teacher,'12345678'),{present:true}));
 // Actual Web SDK multi-student transaction under unchanged assignment rules.
 const batchRows=Array.from({length:5},(_,i)=>({studentId:'teacher_bulk_'+i,class:'10',date:'2026-11-24',present:i%2===0}));
 await env.withSecurityRulesDisabled(async ctx=>{for(const e of batchRows)await setDoc(doc(ctx.firestore(),'schools','12345678','students',e.studentId),{name:'Synthetic '+e.studentId,schoolId:'12345678',class:'10',active:true})});
 const teacherBatch={db:teacher,api:{doc,runTransaction},actor:{uid:'teacher_12345678',schoolId:'12345678',role:'teacher',active:true},schoolId:'12345678',entries:batchRows,assertSession:()=>{}};
 const batchResult=await saveTeacherClassAttendance(teacherBatch);
 if(batchResult.saved!==5||batchResult.changed!==5)throw Error('Teacher bulk attendance must commit all five assigned rows');
 const noChange=await saveTeacherClassAttendance(teacherBatch);
 if(noChange.changed!==0)throw Error('Repeated attendance must not rewrite unchanged rows');

 await assertSucceeds(updateDoc(attendance(teacher,'12345678'),{present:false}));
 await assertFails(updateDoc(attendance(teacher,'12345678'),{date:'2026-11-19'}));
 await assertFails(updateDoc(attendance(teacher,'12345678'),{class:'9'}));
 await assertFails(updateDoc(attendance(teacher,'12345678'),{studentId:'other_student'}));
 await assertFails(updateDoc(attendance(teacher,'12345678'),{schoolId:'87654321'}));
 await assertFails(updateDoc(attendance(teacher,'12345678'),{official:true}));
 await assertFails(updateDoc(attendance(teacher,'87654321'),{present:true}));
 const attendanceAssignment=doc(admin,'schools','12345678','teacher_assignments','12345678:teacher_12345678:10:attendance');
 await assertSucceeds(updateDoc(attendanceAssignment,{active:false}));
 await assertFails(updateDoc(attendance(teacher,'12345678'),{present:true}));
 await assertSucceeds(updateDoc(attendanceAssignment,{active:true}));
 // 99 A second canonical term can be created independently
 await assertSucceeds(setDoc(doc(admin,'schools','12345678','exams','2nd'),{schoolId:'12345678',term:'2nd'}));

 // Complete-class draft is an isolated, revision-checked document.
 // No rule permits these entries to become official marks or results.
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  await setDoc(doc(db,'schools','12345678','subjects','computer'),{
    schoolId:'12345678',name:'Computer',class:'9',active:true
  });
  await setDoc(doc(db,'schools','12345678','mark_settings','9_computer_final'),{
    id:'9_computer_final',schoolId:'12345678',classId:'9',subjectId:'computer',
    examId:'final',active:true,components:[
      {key:'participation',name:'Participation',fullMarks:7},
      {key:'practical',name:'Practical',fullMarks:63},
      {key:'term',name:'Term',fullMarks:30}
    ]
  });
 });
 const draft=(database,sid='12345678')=>doc(database,'schools',sid,'class_mark_drafts','9_computer_final');
 const entries=[{studentId:'s1',isAbsent:false,values:{participation:7,practical:63,term:30},totalObtained:100}];
 const validDraft={format:'smss-v47-complete-class-draft-v1',state:'draft',
   schoolId:'12345678',classId:'9',subjectId:'computer',examId:'final',
   settingsId:'9_computer_final',rosterCount:1,revision:1,
   updatedBy:'admin_12345678',updatedAt:serverTimestamp(),entries};
 await assertFails(setDoc(draft(anon),validDraft));
 await assertFails(setDoc(draft(viewer),{...validDraft,updatedBy:'viewer_12345678'}));
 await assertFails(setDoc(draft(teacher),{...validDraft,updatedBy:'teacher_12345678'}));
 await assertFails(setDoc(draft(db('admin_87654321')),{...validDraft,updatedBy:'admin_87654321'}));
 await assertFails(setDoc(draft(admin,'87654321'),{...validDraft,schoolId:'87654321'}));
 await assertFails(setDoc(draft(admin),{...validDraft,schoolId:'87654321'}));
 await assertFails(setDoc(draft(admin),{...validDraft,settingsId:'wrong'}));
 await assertFails(setDoc(draft(admin),{...validDraft,revision:2}));
 await assertFails(setDoc(draft(admin),{...validDraft,entries:[],rosterCount:1}));
 await assertFails(setDoc(draft(admin),{...validDraft,updatedAt:'forged'}));
 await assertFails(setDoc(draft(admin),{...validDraft,official:true}));
 await assertSucceeds(setDoc(draft(admin),validDraft));
 await assertSucceeds(getDoc(draft(admin)));
 await assertSucceeds(getDoc(draft(superDb)));
 await assertFails(getDoc(draft(viewer)));
 await assertFails(getDoc(draft(teacher)));
 await assertFails(getDoc(draft(anon)));
 await assertFails(getDoc(draft(db('admin_87654321'))));
 await assertFails(getDocs(collection(viewer,'schools','12345678','class_mark_drafts')));
 await assertFails(getDocs(collection(teacher,'schools','12345678','class_mark_drafts')));
 await assertSucceeds(getDocs(collection(admin,'schools','12345678','class_mark_drafts')));
 await assertFails(getDocs(collection(db('admin_87654321'),'schools','12345678','class_mark_drafts')));
 await assertFails(updateDoc(draft(viewer),{revision:2,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(draft(teacher),{revision:2,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(draft(admin),{revision:3,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(draft(admin),{state:'published',revision:2,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(draft(admin),{schoolId:'87654321',revision:2,updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(draft(admin),{revision:2,updatedBy:'admin_12345678',updatedAt:serverTimestamp(),entries}));
 await assertFails(deleteDoc(draft(admin)));
 await assertFails(setDoc(mark(admin,'12345678'),{schoolId:'12345678',studentId:'s1',value:42}));
 await assertFails(setDoc(doc(admin,'schools','12345678','component_marks','9:s1:computer'),{schoolId:'12345678',studentId:'s1',value:42}));

 // A Teacher owns ONLY their own verified subject/class DRAFT. This does
 // not grant any official marks write, publication or cross-teacher access.
 await env.withSecurityRulesDisabled(async context=>{
  await setDoc(doc(context.firestore(),'schools','12345678','teacher_assignments',
   '12345678:teacher_12345678:9:computer'),{
   schoolId:'12345678',uid:'teacher_12345678',classId:'9',subjectId:'computer',active:true
  });
 });
 const teacherDraft=(database,uid='teacher_12345678',sid='12345678')=>
  doc(database,'schools',sid,'teacher_mark_drafts',uid,'class_drafts','9_computer_final');
 const teacherEntries=[{studentId:'s1',isAbsent:false,
  values:{participation:7,practical:63,term:30},totalObtained:100}];
 const teacherPayload={format:'smss-v47-teacher-class-draft-v1',
  state:'draft',schoolId:'12345678',classId:'9',subjectId:'computer',examId:'final',
  settingsId:'9_computer_final',rosterCount:1,revision:1,
  updatedBy:'teacher_12345678',updatedAt:serverTimestamp(),entries:teacherEntries};
 await assertFails(setDoc(teacherDraft(anon),teacherPayload));
 await assertFails(setDoc(teacherDraft(viewer),teacherPayload));
 await assertFails(setDoc(teacherDraft(admin),teacherPayload));
 await assertFails(setDoc(teacherDraft(db('admin_87654321')),teacherPayload));
 await assertFails(setDoc(teacherDraft(teacher,'anotherTeacher'),teacherPayload));
 await assertFails(setDoc(teacherDraft(teacher),{...teacherPayload,updatedBy:'admin_12345678'}));
 await assertFails(setDoc(teacherDraft(teacher),{...teacherPayload,schoolId:'87654321'}));
 await assertFails(setDoc(teacherDraft(teacher),{...teacherPayload,revision:2}));
 await assertFails(setDoc(teacherDraft(teacher),{...teacherPayload,entries:[]}));
 await assertFails(setDoc(teacherDraft(teacher),{...teacherPayload,state:'published'}));
 await assertFails(setDoc(teacherDraft(teacher),{...teacherPayload,updatedAt:'fake'}));
 await assertSucceeds(setDoc(teacherDraft(teacher),teacherPayload));
 await assertSucceeds(getDoc(teacherDraft(teacher)));
 await assertSucceeds(getDoc(teacherDraft(admin)));
 await assertSucceeds(getDoc(teacherDraft(superDb)));
 await assertFails(getDoc(teacherDraft(viewer)));
 await assertFails(getDoc(teacherDraft(anon)));
 await assertFails(getDoc(teacherDraft(db('admin_87654321'))));
 await assertFails(getDoc(teacherDraft(teacher,'anotherTeacher')));
 await assertFails(getDocs(collection(teacher,'schools','12345678','teacher_mark_drafts',
   'teacher_12345678','class_drafts')));
 await assertFails(updateDoc(teacherDraft(viewer),{revision:2,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(teacherDraft(admin),{revision:2,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(teacherDraft(teacher),{revision:3,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(teacherDraft(teacher),{state:'published',revision:2,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(teacherDraft(teacher),{classId:'10',revision:2,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(teacherDraft(teacher),{schoolId:'87654321',revision:2,updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(teacherDraft(teacher),{revision:2,updatedAt:serverTimestamp(),entries:teacherEntries}));
 const teacherAssign=doc(admin,'schools','12345678','teacher_assignments',
  '12345678:teacher_12345678:9:computer');
 await assertSucceeds(updateDoc(teacherAssign,{active:false}));
 await assertFails(getDoc(teacherDraft(teacher)));
 await assertSucceeds(getDoc(teacherDraft(admin)));
 await assertFails(updateDoc(teacherDraft(teacher),{revision:3,updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(teacherAssign,{active:true}));
 await assertSucceeds(getDoc(teacherDraft(teacher)));
 await assertSucceeds(updateDoc(teacherDraft(teacher),{revision:3,updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(teacherDraft(teacher)));
 await assertFails(setDoc(mark(teacher,'12345678'),{schoolId:'12345678',studentId:'s1',value:44}));

 // Server-side staged marks must NEVER leak through client Firestore rules.
 // Verified staging manifest is also hidden from all client roles.
 // Seed a realistic staged batch as a trusted emulator Admin SDK would.
 const stageDoc=(database,sid='12345678')=>doc(database,'schools',sid,'marks_staging','pub_00000001','batches','b0000');
 const stageManifest=(database,sid='12345678')=>doc(database,'schools',sid,'marks_staging','pub_00000001');
 const stageCollection=(database,sid='12345678')=>collection(database,'schools',sid,'marks_staging','pub_00000001','batches');
 await env.withSecurityRulesDisabled(async context=>{
  await setDoc(stageManifest(context.firestore()),{
   format:'smss-v47-verified-staging-manifest-v1',state:'staged_verified_not_published',
   schoolId:'12345678',publicationId:'pub_00000001',classId:'9',subjectId:'computer',
   examId:'final',digest:'a'.repeat(64),rosterCount:1,batchCount:1,
   verifiedBy:'admin_12345678',settingsRevision:'s1',rosterRevision:'r1',
   writeAuthorized:false,publicationAllowed:false
  });
  await setDoc(stageDoc(context.firestore()),{
   format:'smss-v47-staged-page-v1',schoolId:'12345678',
   publicationId:'pub_00000001',classId:'9',subjectId:'computer',
   examId:'final',digest:'a'.repeat(64),index:0,count:1,
   firstStudentId:'student_1',lastStudentId:'student_1',
   entries:[{studentId:'student_1',isAbsent:false,values:{written:35},totalObtained:35}]
  });
 });
 for(const userDb of [anon,viewer,teacher,admin,superDb,db('admin_87654321')]){
  await assertFails(getDoc(stageManifest(userDb)));
  await assertFails(setDoc(stageManifest(userDb),{state:'committed'}));
  await assertFails(updateDoc(stageManifest(userDb),{state:'committed'}));
  await assertFails(deleteDoc(stageManifest(userDb)));
  await assertFails(getDoc(stageDoc(userDb)));
  await assertFails(getDocs(stageCollection(userDb)));
  await assertFails(setDoc(stageDoc(userDb),{schoolId:'12345678',official:true}));
  await assertFails(updateDoc(stageDoc(userDb),{official:true}));
  await assertFails(deleteDoc(stageDoc(userDb)));
 }
 await assertFails(getDoc(stageDoc(admin,'87654321')));
 // Publishing three linked records uses an Admin SDK transaction only;
 // no browser (even Super Admin) may infer, read or overwrite a pointer.
 const protectedOfficial=(database,collectionName,sid='12345678')=>
  doc(database,'schools',sid,collectionName,'pub_00000001');
 const officialCollections=['official_marks_pointers','official_marks_publications','official_marks_audit'];
 await env.withSecurityRulesDisabled(async context=>{
  const root=context.firestore();
  for(const name of officialCollections)
   await setDoc(protectedOfficial(root,name),{schoolId:'12345678',publicationId:'pub_00000001',digest:'a'.repeat(64)});
 });
 for(const userDb of [anon,viewer,teacher,admin,superDb,db('admin_87654321')]){
  for(const name of officialCollections){
   const ref=protectedOfficial(userDb,name);
   await assertFails(getDoc(ref));
   await assertFails(getDocs(collection(userDb,'schools','12345678',name)));
   await assertFails(setDoc(protectedOfficial(userDb,name,'87654321'),{schoolId:'87654321',publicationId:'pub_00000001'}));
   await assertFails(updateDoc(ref,{digest:'b'.repeat(64)}));
   await assertFails(deleteDoc(ref));
  }
 }
 console.log('V47 Firestore emulator: staging plus official publication pointer/header/audit are server-only for all browser roles');
}finally{await env.cleanup();}
