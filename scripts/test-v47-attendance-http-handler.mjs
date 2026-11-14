import assert from "node:assert/strict";
import {createV47AttendanceHttpHandler} from "../src/v47/attendance-http-handler.mjs";
const docs=new Map([["schools/school_A001",{status:"active"}],["schools/school_A001/members/user1",{active:true,roles:["viewer"]}],["schools/school_B001",{status:"active"}]]);
const calls=[];
const firestore={
 doc:path=>({get:async()=>({exists:docs.has(path),data:()=>docs.get(path)})}),
 collection:path=>{calls.push(path);return {where(){return this;},async get(){return {docs:[{id:"attendance1",data:()=>({students:[{studentId:"s1",status:"present"}]})}]};}};}
};
const auth={verifyIdToken:async token=>{if(token!=="valid")throw Error("Invalid token");return {uid:"user1",firebase:{sign_in_provider:"password"}};}};
const handler=createV47AttendanceHttpHandler({auth,firestore});
const req={method:"GET",headers:{authorization:"Bearer valid"},query:{schoolId:"school_A001",className:"9",date:"2083-01-01"}};
assert.deepEqual(await handler(req),{status:200,body:{attendance:[{id:"attendance1",students:[{studentId:"s1",status:"present"}]}]}});
assert.deepEqual(calls,["schools/school_A001/attendance"]);
assert.equal((await handler({...req,method:"POST"})).status,405);
assert.equal((await handler({...req,headers:{}})).status,401);
assert.equal((await handler({...req,query:{...req.query,uid:"other"}})).status,400);
assert.equal((await handler({...req,headers:{authorization:"Bearer bad"}})).status,403);
assert.equal((await handler({...req,query:{...req.query,schoolId:"school_B001"}})).status,403);
assert.equal((await handler({...req,query:{...req.query,date:"invalid"}})).status,400);
docs.set("schools/school_A001",{status:"suspended"});
assert.equal((await handler(req)).status,403);
assert.equal(calls.length,1,"Rejected requests must not query attendance");
console.log("V47 attendance HTTP handler tests passed");
