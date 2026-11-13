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
   await setDoc(doc(db,"schools",schoolId),{name:schoolId});
   await setDoc(doc(db,"schools",schoolId,"students","student1"),{name:"Synthetic Student"});
  }
  await setDoc(doc(db,"schools",schoolA,"members","adminA"),{active:true,roles:["school_admin"]});
  await setDoc(doc(db,"schools",schoolA,"members","viewerA"),{active:true,roles:["viewer"]});
  await setDoc(doc(db,"schools",schoolA,"members","teacherA"),{active:true,roles:["subject_teacher"]});
  await setDoc(doc(db,"platform_admins","root"),{active:true});
 });
 const admin=env.authenticatedContext("adminA").firestore();
 const viewer=env.authenticatedContext("viewerA").firestore();
 const teacher=env.authenticatedContext("teacherA").firestore();
 const root=env.authenticatedContext("root").firestore();
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
 await assertFails(setDoc(doc(admin,"schools",schoolA,"members","adminA"),{active:true,roles:["school_admin"]}));
 await assertFails(setDoc(doc(root,"schools","school_C001"),{name:"No direct client onboarding"}));
 await assertSucceeds(getDoc(doc(root,"schools",schoolA)));
 await assertFails(getDoc(doc(root,"schools",schoolA,"students","student1")));
 console.log("V47 tenant Firestore emulator isolation tests passed");
} finally {await env.cleanup();}
