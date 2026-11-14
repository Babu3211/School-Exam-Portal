import assert from "node:assert/strict";
import {readVerifiedV46Attendance} from "../src/v47/verified-v46-attendance-reader.mjs";
const docs=new Map([["schools/school_A001",{status:"active"}],["schools/school_A001/members/user1",{active:true,roles:["viewer"]}],["schools/school_B001",{status:"active"}]]);
const calls=[];
let returnedSchoolId;
const firestore={
 doc:path=>({get:async()=>({exists:docs.has(path),data:()=>docs.get(path)})}),
 collection:path=>{calls.push(["collection",path]);return {where(field,op,value){calls.push([field,op,value]);return this;},async get(){return {docs:[{id:"real-id",data:()=>({id:"forged-id",...(returnedSchoolId?{schoolId:returnedSchoolId}:{}),students:[{studentId:"s1",status:"present"}]})}]};}};}
};
const auth={verifyIdToken:async(token)=>{if(token!=="valid")throw Error("Invalid token");return {uid:"user1",firebase:{sign_in_provider:"password"}};}};
const args={idToken:"valid",schoolId:"school_A001",className:"9",date:"2083-01-01",auth,firestore};
assert.deepEqual(await readVerifiedV46Attendance(args),[{id:"real-id",students:[{studentId:"s1",status:"present"}]}]);
assert.deepEqual(calls[0],["collection","schools/school_A001/attendance"]);
assert.deepEqual(calls[1],["className","==","9"]);
assert.deepEqual(calls[2],["date","==","2083-01-01"]);
assert.deepEqual(calls[3],["attendanceType","==","daily"]);
returnedSchoolId="school_B001";
await assert.rejects(readVerifiedV46Attendance(args),/Attendance tenant mismatch/);
returnedSchoolId="school_A001";
assert.equal((await readVerifiedV46Attendance(args))[0].schoolId,"school_A001");
returnedSchoolId=undefined;
await assert.rejects(readVerifiedV46Attendance({...args,idToken:"bad"}),/Invalid token/);
await assert.rejects(readVerifiedV46Attendance({...args,schoolId:"school_B001"}),/No active membership/);
docs.set("schools/school_A001",{status:"suspended"});
await assert.rejects(readVerifiedV46Attendance(args),/School is not active/);
assert.equal(calls.length,12,"Denied requests must not access attendance collection");
console.log("V47 verified batch attendance reader tests passed");
