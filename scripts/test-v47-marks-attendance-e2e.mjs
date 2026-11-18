/**
 * Offline integration test: both HTTP endpoints, shared verified membership,
 * two schools, V46 data shapes. No Firebase credentials or live data.
 */
import assert from "node:assert/strict";
import {createV47MarksHttpHandler} from "../src/v47/marks-http-handler.mjs";
import {createV47AttendanceHttpHandler} from "../src/v47/attendance-http-handler.mjs";
const documents=new Map([
 ["schools/school_A001",{status:"active"}],
 ["schools/school_B001",{status:"active"}],
 ["schools/school_A001/members/user1",{active:true,roles:["viewer"]}],
 ["schools/school_B001/members/user2",{active:true,roles:["school_admin"]}]
]);
const queried=[];
const firestore={
 doc:path=>({get:async()=>({exists:documents.has(path),data:()=>documents.get(path)})}),
 collection:path=>({
  where(field,operator,value){assert.equal(operator,"==");this.filters??=[];this.filters.push([field,value]);return this;},
  async get(){
   queried.push({path,filters:this.filters});
   if(path==="schools/school_A001/marks")return {docs:[{id:"m1",data:()=>({className:"9",subject:"Computer",marks:72})}]};
   if(path==="schools/school_A001/attendance")return {docs:[{id:"a1",data:()=>({className:"9",date:"2083-01-01",attendanceType:"daily",students:[{studentId:"s1",status:"present"}]})}]};
   if(path==="schools/school_B001/marks")return {docs:[{id:"b-m1",data:()=>({className:"9",subject:"Computer",marks:88})}]};
   if(path==="schools/school_B001/attendance")return {docs:[{id:"b-a1",data:()=>({className:"9",date:"2083-01-01",attendanceType:"daily",students:[{studentId:"b-s1",status:"absent"}]})}]};
   throw Error("Unexpected cross-tenant collection read");
  }
 })
};
const auth={verifyIdToken:async(token,revoked)=>{
 assert.equal(revoked,true);
 if(token!=="token-user1" && token!=="token-user2")throw Error("Invalid token");
 return {uid:token==="token-user1"?"user1":"user2",firebase:{sign_in_provider:"password"}};
}};
const marks=createV47MarksHttpHandler({auth,firestore});
const attendance=createV47AttendanceHttpHandler({auth,firestore});
const request=(schoolId)=>({method:"GET",headers:{authorization:"Bearer token-user1"},query:{schoolId,className:"9",subject:"Computer",date:"2083-01-01"}});
const markReq=request("school_A001");delete markReq.query.date;
const attendanceReq=request("school_A001");delete attendanceReq.query.subject;
const m=await marks(markReq);
const a=await attendance(attendanceReq);
assert.equal(m.status,200);assert.equal(m.body.marks[0].marks,72);
assert.equal(a.status,200);assert.equal(a.body.attendance[0].students[0].status,"present");
assert.deepEqual(queried.map(q=>q.path),["schools/school_A001/marks","schools/school_A001/attendance"]);
assert.equal((await marks({...markReq,query:{...markReq.query,schoolId:"school_B001"}})).status,403);
assert.equal((await attendance({...attendanceReq,query:{...attendanceReq.query,schoolId:"school_B001"}})).status,403);
// Reverse-direction isolation: user2 can read only B, never A.
const bMarkReq={...markReq,headers:{authorization:"Bearer token-user2"},query:{...markReq.query,schoolId:"school_B001"}};
const bAttendanceReq={...attendanceReq,headers:{authorization:"Bearer token-user2"},query:{...attendanceReq.query,schoolId:"school_B001"}};
const bm=await marks(bMarkReq);
const ba=await attendance(bAttendanceReq);
assert.equal(bm.status,200);assert.equal(bm.body.marks[0].marks,88);
assert.equal(ba.status,200);assert.equal(ba.body.attendance[0].students[0].status,"absent");
assert.equal((await marks({...bMarkReq,query:{...bMarkReq.query,schoolId:"school_A001"}})).status,403);
assert.equal((await attendance({...bAttendanceReq,query:{...bAttendanceReq.query,schoolId:"school_A001"}})).status,403);
assert.deepEqual(queried.map(q=>q.path),[
 "schools/school_A001/marks","schools/school_A001/attendance",
 "schools/school_B001/marks","schools/school_B001/attendance"
]);
documents.set("schools/school_A001",{status:"suspended"});
assert.equal((await marks(markReq)).status,403);
assert.equal((await attendance(attendanceReq)).status,403);
assert.equal(queried.length,4,"No data reads after school suspension");
// Revoking a member must immediately deny both endpoints without tenant reads.
documents.set("schools/school_B001/members/user2",{active:false,roles:["school_admin"]});
assert.equal((await marks(bMarkReq)).status,403);
assert.equal((await attendance(bAttendanceReq)).status,403);
assert.equal(queried.length,4,"Revoked membership must not read tenant data");
// Even an active membership must not bypass a suspended school.
documents.set("schools/school_B001/members/user2",{active:true,roles:["school_admin"]});
documents.set("schools/school_B001",{status:"suspended"});
assert.equal((await marks(bMarkReq)).status,403);
assert.equal((await attendance(bAttendanceReq)).status,403);
assert.equal(queried.length,4,"Suspended school must not read tenant data");
console.log("V47 marks and attendance cross-tenant HTTP integration tests passed");
