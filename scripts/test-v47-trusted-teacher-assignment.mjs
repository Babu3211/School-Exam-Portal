import assert from "node:assert/strict";
import {prepareTeacherAssignment,assignTeacherOnTrustedServer} from "../src/v47/trusted-teacher-assignment.mjs";
const input={schoolId:"school_A001",teacherUid:"teacher1",classId:"9",subjectId:"computer",kind:"subject_teacher",terms:["first","final"]};
assert.equal(prepareTeacherAssignment(input).id,"teacher1_9_computer");
assert.throws(()=>prepareTeacherAssignment({...input,teacherUid:"../admin"}));
assert.throws(()=>prepareTeacherAssignment({...input,classId:"13"}));
assert.throws(()=>prepareTeacherAssignment({...input,terms:["fourth"]}));
let writes=0;
const firestore={
 doc:path=>({path}),
 runTransaction:async fn=>fn({
  get:async ref=>({exists:true,data:()=>({active:true,roles:["subject_teacher"]})}),
  set:(ref,data)=>{writes++;assert.equal(ref.path,"schools/school_A001/assignments/teacher1_9_computer");assert.equal(data.uid,"teacher1");}
 })
};
const adminSession={uid:"admin1",schoolId:"school_A001",roles:["school_admin"]};
await assert.rejects(assignTeacherOnTrustedServer({adminSession:{...adminSession,schoolId:"school_B001"},input,firestore}));
await assert.rejects(assignTeacherOnTrustedServer({adminSession:{...adminSession,roles:["viewer","school_admin"]},input,firestore}));
assert.equal(writes,0);
const assigned=await assignTeacherOnTrustedServer({adminSession,input,firestore});
assert.equal(assigned.schoolId,"school_A001");assert.equal(writes,1);
console.log("V47 trusted teacher assignment contract tests passed");
