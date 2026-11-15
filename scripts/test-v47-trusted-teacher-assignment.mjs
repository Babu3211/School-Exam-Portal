import assert from "node:assert/strict";
import {prepareTeacherAssignment,assignTeacherOnTrustedServer} from "../src/v47/trusted-teacher-assignment.mjs";
const input={schoolId:"school_A001",teacherUid:"teacher1",classId:"9",subjectId:"computer",kind:"subject_teacher",terms:["first","final"]};
assert.equal(prepareTeacherAssignment(input).id,"teacher1_9_computer");
assert.throws(()=>prepareTeacherAssignment({...input,teacherUid:"../admin"}));
assert.throws(()=>prepareTeacherAssignment({...input,classId:"13"}));
assert.throws(()=>prepareTeacherAssignment({...input,terms:["fourth"]}));
assert.throws(()=>prepareTeacherAssignment({...input,teacherUid:["teacher1"]}));
assert.throws(()=>prepareTeacherAssignment({...input,classId:9}));
assert.throws(()=>prepareTeacherAssignment({...input,subjectId:["computer"]}));
let writes=0;
const firestore={
 doc:path=>({path}),
 runTransaction:async fn=>fn({
  get:async ref=>({exists:true,data:()=>ref.path.endsWith("/admin1")?{active:true,roles:["school_admin"]}:{active:true,roles:["subject_teacher"]}}),
  set:(ref,data)=>{writes++;assert.equal(ref.path,"schools/school_A001/assignments/teacher1_9_computer");assert.equal(data.uid,"teacher1");}
 })
};
const adminSession={uid:"admin1",schoolId:"school_A001",roles:["school_admin"]};
await assert.rejects(assignTeacherOnTrustedServer({adminSession:{...adminSession,schoolId:"school_B001"},input,firestore}));
await assert.rejects(assignTeacherOnTrustedServer({adminSession:{...adminSession,roles:["viewer","school_admin"]},input,firestore}));
assert.equal(writes,0);
const assigned=await assignTeacherOnTrustedServer({adminSession,input,firestore});
assert.equal(assigned.schoolId,"school_A001");assert.equal(writes,1);
const revoked={
 doc:path=>({path}),
 runTransaction:async fn=>fn({
  get:async ref=>({exists:true,data:()=>ref.path.endsWith("/admin1")?{active:false,roles:["school_admin"]}:{active:true,roles:["subject_teacher"]}}),
  set:()=>{throw new Error("Revoked admin must never write");}
 })
};
await assert.rejects(assignTeacherOnTrustedServer({adminSession,input,firestore:revoked}),/Active school admin membership required/);
for(const [badPath,badRecord] of [
 ["admin1",{active:true,roles:["school_admin"],uid:"other_admin",schoolId:"school_A001"}],
 ["admin1",{active:true,roles:["school_admin"],uid:"admin1",schoolId:"school_B001"}],
 ["teacher1",{active:true,roles:["subject_teacher"],uid:"another_teacher",schoolId:"school_A001"}],
 ["teacher1",{active:true,roles:["subject_teacher"],uid:"teacher1",schoolId:"school_B001"}]
]){
 const corrupt={
  doc:path=>({path}),
  runTransaction:async fn=>fn({
   get:async ref=>({exists:true,data:()=>ref.path.endsWith("/"+badPath)?badRecord:
    ref.path.endsWith("/admin1")?{active:true,roles:["school_admin"],uid:"admin1",schoolId:"school_A001"}:
    {active:true,roles:["subject_teacher"],uid:"teacher1",schoolId:"school_A001"}}),
   set:()=>{throw Error("Mismatched identity must never write");}
  })
 };
 await assert.rejects(assignTeacherOnTrustedServer({adminSession,input,firestore:corrupt}),/membership.*required/);
}
console.log("V47 trusted teacher assignment contract tests passed");
