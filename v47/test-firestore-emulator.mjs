import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
import {doc,getDoc,setDoc,updateDoc,deleteDoc,collection,getDocs} from 'firebase/firestore';
import assert from 'node:assert/strict';
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({projectId:'smss-v47-emulator-tests',firestore:{rules,host:'127.0.0.1',port:8187}});
const db=(uid)=>env.authenticatedContext(uid).firestore();
const anon=env.unauthenticatedContext().firestore();
const school=(sid)=>doc(db('root_super'),'schools',sid);
const member=(sid,uid)=>doc(db('root_super'),'schools',sid,'members',uid);
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
 console.log('V47 Firestore emulator: 20 authorization assertions passed');
}finally{await env.cleanup();}
