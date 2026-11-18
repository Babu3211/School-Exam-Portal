import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
import {doc,getDoc,setDoc,updateDoc,deleteDoc,collection,getDocs} from 'firebase/firestore';
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId:'smss-v47-emulator-tests',firestore:{rules,host:'127.0.0.1',port:8187}});
const db=(uid)=>env.authenticatedContext(uid).firestore();
const anon=env.unauthenticatedContext().firestore();
const student=(database,sid)=>doc(database,'schools',sid,'students','student_1');
const mark=(database,sid)=>doc(database,'schools',sid,'marks','mark_1');
const attendance=(database,sid)=>doc(database,'schools',sid,'attendance','attendance_1');
try{
 await env.withSecurityRulesDisabled(async context=>{
  const admin=context.firestore();
  await setDoc(doc(admin,'v47_super_admins','root_super'),{active:true});
  for(const sid of ['school_A','school_B']){
   await setDoc(doc(admin,'schools',sid),{id:sid,name:'School '+sid,active:true});
   for(const [uid,role,active] of [['admin_'+sid,'school_admin',true],['teacher_'+sid,'teacher',true],['viewer_'+sid,'viewer',true],['inactive_'+sid,'viewer',false]]){
    await setDoc(doc(admin,'schools',sid,'members',uid),{uid,schoolId:sid,role,active});
   }
   await setDoc(doc(admin,'schools',sid,'students','student_1'),{name:'Student',className:'Class 10'});
   await setDoc(doc(admin,'schools',sid,'marks','mark_1'),{value:10});
   await setDoc(doc(admin,'schools',sid,'attendance','attendance_1'),{status:'present'});
  }
  await setDoc(doc(admin,'schools','school_inactive'),{id:'school_inactive',name:'Inactive School',active:false});
  await setDoc(doc(admin,'schools','school_inactive','members','viewer_school_A'),{uid:'viewer_school_A',schoolId:'school_inactive',role:'viewer',active:true});
  await setDoc(doc(admin,'schools','school_A','members','forged_user'),{uid:'someone_else',schoolId:'school_A',role:'viewer',active:true});
 });
 const viewer=db('viewer_school_A'),teacher=db('teacher_school_A'),admin=db('admin_school_A'),superDb=db('root_super');
 // 1 Anonymous reads denied
 await assertFails(getDoc(student(anon,'school_A')));
 // 2 Anonymous writes denied
 await assertFails(setDoc(student(anon,'school_A'),{name:'bad'}));
 // 3 Active viewer reads own school
 await assertSucceeds(getDoc(student(viewer,'school_A')));
 // 4 Cross-school read denied
 await assertFails(getDoc(student(viewer,'school_B')));
 // 5 Cross-school write denied
 await assertFails(setDoc(student(admin,'school_B'),{name:'bad'}));
 // 6 Viewer writes denied
 await assertFails(updateDoc(student(viewer,'school_A'),{name:'bad'}));
 // 7 Teacher marks write denied until assignment rules implemented
 await assertFails(updateDoc(mark(teacher,'school_A'),{value:30}));
 // 8 Teacher attendance write denied
 await assertFails(updateDoc(attendance(teacher,'school_A'),{status:'absent'}));
 // 9 School admin can update own marks
 await assertSucceeds(updateDoc(mark(admin,'school_A'),{value:30}));
 // 10 School admin cannot delete
 await assertFails(deleteDoc(mark(admin,'school_A')));
 // 11 Inactive membership denied
 await assertFails(getDoc(student(db('inactive_school_A'),'school_A')));
 // 12 Inactive school denied
 await assertFails(getDoc(doc(viewer,'schools','school_inactive','students','student_1')));
 // 13 Forged uid membership denied
 await assertFails(getDoc(student(db('forged_user'),'school_A')));
 // 14 Super Admin can create only inactive school
 await assertSucceeds(setDoc(doc(superDb,'schools','school_new'),{id:'school_new',name:'New School',active:false}));
 await assertFails(setDoc(doc(superDb,'schools','school_bad'),{id:'school_bad',name:'Bad School',active:true}));
 // 15 Self-provision Super Admin denied
 await assertFails(setDoc(doc(viewer,'v47_super_admins','viewer_school_A'),{active:true}));
 // 16 Arbitrary nested paths denied
 await assertFails(getDoc(doc(viewer,'schools','school_A','students','student_1','private','x')));
 // 17 Cross-school query denied
 await assertFails(getDocs(collection(viewer,'schools','school_B','students')));
 // 18 Own-school query allowed
 await assertSucceeds(getDocs(collection(viewer,'schools','school_A','students')));
 // 19 Unauthorized school listing denied
 await assertFails(getDocs(collection(viewer,'schools')));
 // 20 Super Admin school listing allowed
 await assertSucceeds(getDocs(collection(superDb,'schools')));
 // 21 Teacher can read own marks
 await assertSucceeds(getDoc(mark(teacher,'school_A')));
 // 22 Viewer cannot write marks
 await assertFails(updateDoc(mark(viewer,'school_A'),{value:99}));
 // 23 Viewer cannot write attendance
 await assertFails(updateDoc(attendance(viewer,'school_A'),{status:'absent'}));
 // 24 Teacher cannot edit student details
 await assertFails(updateDoc(student(teacher,'school_A'),{name:'Changed'}));
 // 25 School admin can update own attendance
 await assertSucceeds(updateDoc(attendance(admin,'school_A'),{status:'late'}));
 // 26 School admin cannot remove student
 await assertFails(deleteDoc(student(admin,'school_A')));
 // 27 School admin cannot change membership roles
 await assertFails(updateDoc(doc(admin,'schools','school_A','members','viewer_school_A'),{role:'school_admin'}));
 // 28 Viewer cannot list memberships
 await assertFails(getDocs(collection(viewer,'schools','school_A','members')));
 // 29 School admin can list own memberships
 await assertSucceeds(getDocs(collection(admin,'schools','school_A','members')));
 // 30 School admin cannot list other school's memberships
 await assertFails(getDocs(collection(admin,'schools','school_B','members')));
 // 31 Viewer cannot create arbitrary collection documents
 await assertFails(setDoc(doc(viewer,'schools','school_A','private','x'),{secret:true}));
 // 32 Viewer cannot write own membership
 await assertFails(updateDoc(doc(viewer,'schools','school_A','members','viewer_school_A'),{role:'school_admin'}));
 // 33 Teacher cannot read another school's marks
 await assertFails(getDoc(mark(teacher,'school_B')));
 // 34 Teacher cannot read another school's attendance
 await assertFails(getDoc(attendance(teacher,'school_B')));
 // 35 School admin cannot create active school
 await assertFails(setDoc(doc(admin,'schools','school_admin_new'),{id:'school_admin_new',name:'Admin New',active:false}));
 // 36 Super Admin cannot delete school
 await assertFails(deleteDoc(doc(superDb,'schools','school_A')));
 // 37 Super Admin can activate a school
 await assertSucceeds(updateDoc(doc(superDb,'schools','school_new'),{active:true}));
 // 38 Super Admin cannot alter school ID on update
 await assertFails(updateDoc(doc(superDb,'schools','school_A'),{id:'school_B'}));
 // 39 Anonymous school listing denied
 await assertFails(getDocs(collection(anon,'schools')));
 // 40 Viewer cannot read Super Admin registry
 await assertFails(getDoc(doc(viewer,'v47_super_admins','root_super')));
 // 41 School admin can read school registry entry
 await assertSucceeds(getDoc(doc(admin,'schools','school_A')));
 // 42 School admin cannot read other school registry entry
 await assertFails(getDoc(doc(admin,'schools','school_B')));
 // 43 Viewer cannot delete marks
 await assertFails(deleteDoc(mark(viewer,'school_A')));
 // 44 Teacher cannot delete attendance
 await assertFails(deleteDoc(attendance(teacher,'school_A')));
 // 45 School admin can create own student
 await assertSucceeds(setDoc(doc(admin,'schools','school_A','students','student_2'),{name:'New Student'}));
 // 46 School admin cannot create student in other school
 await assertFails(setDoc(doc(admin,'schools','school_B','students','student_2'),{name:'Bad'}));
 // 47 Viewer can read own attendance
 await assertSucceeds(getDoc(attendance(viewer,'school_A')));
 // 48 Viewer cannot read another school's attendance
 await assertFails(getDoc(attendance(viewer,'school_B')));
 // 49 Teacher cannot create marks without assignment authorization
 await assertFails(setDoc(doc(teacher,'schools','school_A','marks','mark_2'),{value:45}));
 // 50 School admin cannot delete staff
 await assertFails(deleteDoc(doc(admin,'schools','school_A','staff','staff_1')));
 // 51 School admin can create inactive teacher
 await assertSucceeds(setDoc(doc(admin,'schools','school_A','members','new_teacher_A'),{uid:'new_teacher_A',schoolId:'school_A',role:'teacher',active:false}));
 // 52 School admin can activate that teacher
 await assertSucceeds(updateDoc(doc(admin,'schools','school_A','members','new_teacher_A'),{active:true}));
 // 53 School admin can create inactive viewer
 await assertSucceeds(setDoc(doc(admin,'schools','school_A','members','new_viewer_A'),{uid:'new_viewer_A',schoolId:'school_A',role:'viewer',active:false}));
 // 54 School admin cannot create another school admin
 await assertFails(setDoc(doc(admin,'schools','school_A','members','evil_admin'),{uid:'evil_admin',schoolId:'school_A',role:'school_admin',active:false}));
 // 55 School admin cannot create an active teacher directly
 await assertFails(setDoc(doc(admin,'schools','school_A','members','active_teacher'),{uid:'active_teacher',schoolId:'school_A',role:'teacher',active:true}));
 // 56 School admin cannot change teacher to school admin
 await assertFails(updateDoc(doc(admin,'schools','school_A','members','new_teacher_A'),{role:'school_admin'}));
 // 57 School admin cannot edit another school's memberships
 await assertFails(updateDoc(doc(admin,'schools','school_B','members','viewer_school_B'),{active:false}));
 // 58 School admin cannot edit own membership
 await assertFails(updateDoc(doc(admin,'schools','school_A','members','admin_school_A'),{active:false}));
 // 59 Viewer cannot create a membership
 await assertFails(setDoc(doc(viewer,'schools','school_A','members','viewer_created'),{uid:'viewer_created',schoolId:'school_A',role:'viewer',active:false}));
 // 60 School admin cannot delete a teacher membership
 await assertFails(deleteDoc(doc(admin,'schools','school_A','members','new_teacher_A')));
 console.log('V47 Firestore emulator: 60 authorization assertions passed');
}finally{await env.cleanup();}
