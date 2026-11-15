import assert from "node:assert/strict";
import {setSparkTeacherAssignmentActive} from "../src/v47/spark-teacher-assignment-status.mjs";
const writes=[];
const args={auth:{currentUser:{uid:"adminA"}},firestore:{},doc:(_db,...parts)=>parts.join("/"),updateDoc:async(path,data)=>writes.push({path,data}),projectId:"smss-exam-portal-v47",schoolId:"school_A001",assignmentId:"teacherA_9_computer",active:false};
await assert.rejects(setSparkTeacherAssignmentActive({...args,projectId:"exam-portal-smss-95016"}),/V47 staging/);
await assert.rejects(setSparkTeacherAssignmentActive({...args,auth:{currentUser:null}}),/Authentication/);
await assert.rejects(setSparkTeacherAssignmentActive({...args,auth:{currentUser:{uid:"anon",isAnonymous:true}}}),/Authentication/);
await assert.rejects(setSparkTeacherAssignmentActive({...args,schoolId:"../school_B001"}),/school/i);
await assert.rejects(setSparkTeacherAssignmentActive({...args,assignmentId:"bad/id"}),/Invalid assignment ID/);
await assert.rejects(setSparkTeacherAssignmentActive({...args,assignmentId:" teacherA_9"}),/Invalid assignment ID/);
await assert.rejects(setSparkTeacherAssignmentActive({...args,active:"false"}),/boolean/);
assert.deepEqual(await setSparkTeacherAssignmentActive(args),{schoolId:"school_A001",assignmentId:"teacherA_9_computer",active:false});
assert.deepEqual(await setSparkTeacherAssignmentActive({...args,active:true}),{schoolId:"school_A001",assignmentId:"teacherA_9_computer",active:true});
assert.deepEqual(writes,[
 {path:"schools/school_A001/assignments/teacherA_9_computer",data:{active:false}},
 {path:"schools/school_A001/assignments/teacherA_9_computer",data:{active:true}}
]);
console.log("V47 Spark assignment status adapter checks passed");
