import {initializeTestEnvironment,assertFails,assertSucceeds} from "@firebase/rules-unit-testing";
import {readFileSync} from "node:fs";
import {doc,getDoc,setDoc,collection,getDocs} from "firebase/firestore";
const rules=readFileSync(new URL("../firestore.v47.prototype.rules",import.meta.url),"utf8");
const env=await initializeTestEnvironment({projectId:"smss-v47-tenant-rules-test",firestore:{rules,host:"127.0.0.1",port:8080}});
const schoolA="school_A001",schoolB="school_B001";
try {
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  for(const schoolId of [schoolA,schoolB]){
   await setDoc(doc(db,"schools",schoolId),{name:schoolId,status:"active"});
   await setDoc(doc(db,"schools",schoolId,"students","student1"),{name:"Synthetic Student"});
  }
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
 await assertSucceeds(setDoc(studentA,{name:"Synthetic Updated"}));
 await assertFails(getDoc(doc(admin,"schools",schoolB,"students","student1")));
 await assertFails(getDocs(collection(admin,"schools",schoolB,"students")));
 await assertFails(setDoc(doc(admin,"schools",schoolB,"students","student2"),{name:"No"}));
 await assertSucceeds(getDoc(doc(viewer,"schools",schoolA,"students","student1")));
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"students","student1"),{name:"No"}));
 await assertFails(setDoc(doc(teacher,"schools",schoolA,"students","student1"),{name:"No"}));
 await assertFails(getDoc(doc(outsider,"schools",schoolA,"students","student1")));
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"classes","class9"),{name:"9"}));
 await assertSucceeds(getDoc(doc(viewer,"schools",schoolA,"classes","class9")));
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"classes","class9"),{name:"10"}));
 await assertFails(setDoc(doc(admin,"schools",schoolB,"classes","class9"),{name:"9"}));
 await assertSucceeds(setDoc(doc(admin,"schools",schoolA,"school_settings","default"),{name:"School A"}));
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"school_settings","default"),{name:"Changed"}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"audit_logs","log1"),{event:"tamper"}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"user_roles","user1"),{role:"admin"}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"public_results","result1"),{published:true}));
 await assertFails(setDoc(doc(admin,"schools",schoolA,"school_gallery","photo1"),{url:"unsafe"}));

 await assertFails(setDoc(doc(admin,"schools",schoolA,"members","adminA"),{active:true,roles:["school_admin"]}));
 await assertFails(setDoc(doc(root,"schools","school_C001"),{name:"No direct client onboarding"}));
 await assertSucceeds(getDoc(doc(root,"schools",schoolA)));
 await assertFails(getDoc(doc(root,"schools",schoolA,"students","student1")));
 const mark={schoolId:schoolA,classId:"9",subjectId:"computer",studentId:"student1",term:"first",score:30};
 await assertSucceeds(setDoc(doc(subject,"schools",schoolA,"marks","m1"),mark));
 await assertFails(setDoc(doc(subject,"schools",schoolB,"marks","m1"),{...mark,schoolId:schoolB}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m2"),{...mark,subjectId:"math"}));
 await assertFails(setDoc(doc(subject,"schools",schoolA,"marks","m_missing"),{...mark,studentId:"unknown"}));
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
 await assertFails(setDoc(doc(subject,"schools",schoolA,"attendance","a2"),attendance));
 await assertFails(setDoc(doc(viewer,"schools",schoolA,"attendance","a3"),attendance));
 await assertFails(setDoc(doc(outsider,"schools",schoolA,"attendance","a3"),attendance));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","a3"),{...attendance,term:"second"}));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","a3"),{...attendance,present:"true"}));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolB,"attendance","a4"),{...attendance,schoolId:schoolB}));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","a_missing"),{...attendance,studentId:"unknown"}));
 await assertFails(setDoc(doc(classTeacher,"schools",schoolA,"attendance","a1"),{...attendance,studentId:"student2"}));
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

 console.log("V47 tenant Firestore emulator isolation and exam assignment tests passed");
} finally {await env.cleanup();}
