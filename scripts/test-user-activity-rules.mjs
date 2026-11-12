import {readFile} from "node:fs/promises";
import {initializeTestEnvironment,assertSucceeds,assertFails} from "@firebase/rules-unit-testing";
import {doc,collection,addDoc,setDoc,getDoc,getDocs,updateDoc,serverTimestamp} from "firebase/firestore";
const ADMIN="K6uSLmqg0vWCtCuzwtxKzFpQMu62",USER="activity-teacher",VIEWER="activity-viewer",INACTIVE="activity-inactive";
const env=await initializeTestEnvironment({projectId:"smss-v45-activity-test",firestore:{rules:await readFile("firestore.rules","utf8"),host:"127.0.0.1",port:8080}});
try{
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  for(const [uid,role] of [[USER,"subject_teacher"],[VIEWER,"viewer"],[INACTIVE,"viewer"]])
   await setDoc(doc(db,"user_roles",uid),{active:uid!==INACTIVE,roles:[role]});
 });
 const db=uid=>env.authenticatedContext(uid).firestore();
 const session="activity-test-session-123456";
 await assertSucceeds(setDoc(doc(db(USER),"user_presence",session),{uid:USER,online:true,updatedAt:serverTimestamp()}));
 await assertSucceeds(addDoc(collection(db(USER),"user_activity"),{uid:USER,type:"login",sessionId:session,at:serverTimestamp()}));
 await assertSucceeds(getDocs(collection(db(ADMIN),"user_presence")));
 await assertSucceeds(getDocs(collection(db(ADMIN),"user_activity")));
 await assertFails(getDocs(collection(db(VIEWER),"user_presence")));
 await assertFails(getDocs(collection(db(USER),"user_activity")));
 await assertFails(setDoc(doc(db(VIEWER),"user_presence",session),{uid:VIEWER,online:true,updatedAt:serverTimestamp()}));
 await assertFails(addDoc(collection(db(USER),"user_activity"),{uid:ADMIN,type:"login",sessionId:session,at:serverTimestamp()}));
 await assertFails(addDoc(collection(db(INACTIVE),"user_activity"),{uid:INACTIVE,type:"login",sessionId:session,at:serverTimestamp()}));
 await assertFails(updateDoc(doc(db(VIEWER),"user_presence",session),{online:false,updatedAt:serverTimestamp()}));
 console.log("V45 activity/presence Firestore permissions passed.");
}finally{await env.cleanup();}
