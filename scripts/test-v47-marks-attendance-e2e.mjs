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
   if(path==="schools/school_A001/attendance")return {docs:[{id:"a1",data:()=>({className:"9",date:"2083-01-01",students:[{studentId:"s1",status:"present"}]})}]};
   throw Error("Unexpected cross-tenant collection read");
  }
 })
};
const auth={verifyIdToken:async(token,revoked)=>{
 assert.equal(revoked,true);
 if(token!=="token-user1")throw Error("Invalid token");
 return {uid:"user1",firebase:{sign_in_provider:"password"}};
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
documents.set("schools/school_A001",{status:"suspended"});
assert.equal((await marks(markReq)).status,403);
assert.equal((await attendance(attendanceReq)).status,403);
assert.equal(queried.length,2,"No data reads after school suspension");
console.log("V47 marks and attendance cross-tenant HTTP integration tests passed");
