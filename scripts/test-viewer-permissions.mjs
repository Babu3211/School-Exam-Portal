import {readFile} from "node:fs/promises";
import {initializeTestEnvironment,assertFails,assertSucceeds} from "@firebase/rules-unit-testing";
import {doc,getDoc,setDoc,deleteDoc,serverTimestamp} from "firebase/firestore";

const env=await initializeTestEnvironment({
  projectId:"smss-v44-rules-test",
  firestore:{rules:await readFile("firestore.rules","utf8"),host:"127.0.0.1",port:8080}
});
const viewer="viewer-only-test",mixed="viewer-teacher-test",admin="K6uSLmqg0vWCtCuzwtxKzFpQMu62";
const db=uid=>env.authenticatedContext(uid).firestore();
try {
  await env.withSecurityRulesDisabled(async ctx=>{
    const root=ctx.firestore();
    for(const uid of [viewer,mixed]) await setDoc(doc(root,"user_roles",uid),{
      active:true,roles:uid===viewer?["viewer"]:["viewer","subject_teacher","class_teacher"],
      subjectAssignmentKeys:["9::Mathematics"],subjectAssignmentClassNames:["9"],
      subjectAssignmentSectionKeys:["9::Mathematics::A"],classTeacherClassNames:["9"]
    });
    await setDoc(doc(root,"students","viewer-test-student"),{name:"Viewer Test",class:"9",active:true});
    await setDoc(doc(root,"staff","viewer-test-staff"),{name:"Staff Test"});
    await setDoc(doc(root,"exams","viewer-test-exam"),{className:"9",examName:"Test"});
    await setDoc(doc(root,"marks","viewer-test-mark"),{className:"9",subject:"Mathematics",section:"A",studentId:"viewer-test-student"});
  });
  for(const uid of [viewer,mixed]){
    for(const [coll,id] of [["students","viewer-test-student"],["staff","viewer-test-staff"],["exams","viewer-test-exam"],["marks","viewer-test-mark"]]){
      await assertSucceeds(getDoc(doc(db(uid),coll,id)));
      await assertFails(setDoc(doc(db(uid),coll,"viewer-test-forged"),{name:"Forbidden"}));
      await assertFails(deleteDoc(doc(db(uid),coll,id)));
    }
    await assertFails(setDoc(doc(db(uid),"attendance","viewer-test-attendance"),{
      date:"2083-07-20",className:"9",attendanceType:"daily",subject:null,
      students:[],totalStudents:0,presentCount:0,absentCount:0,leaveCount:0,
      academicYear:"2083",createdBy:uid,createdAt:serverTimestamp(),
      updatedBy:uid,updatedAt:serverTimestamp()
    }));
    await assertFails(setDoc(doc(db(uid),"audit_logs","viewer-test-log"),{uid,action:"test"}));
    await assertFails(setDoc(doc(db(uid),"question_bank","viewer-test-question"),{className:"9",subject:"Mathematics",section:"A",createdBy:uid}));
    await assertFails(setDoc(doc(db(uid),"question_papers","viewer-test-paper"),{className:"9",subject:"Mathematics",section:"A",createdBy:uid}));
  }
  await assertSucceeds(getDoc(doc(db(admin),"students","viewer-test-student")));
  console.log("Viewer-only and viewer+teacher permission regression checks passed.");
} finally {await env.cleanup();}
