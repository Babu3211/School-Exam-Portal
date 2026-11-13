import assert from "node:assert/strict";
import {createV47DashboardHttpHandler} from "../src/v47/dashboard-http-handler.mjs";
const records=new Map([
 ["schools/school_A001",{status:"active",name:"School A",annualFeeNpr:5000}],
 ["schools/school_A001/members/user1",{active:true,roles:["viewer"]}],
 ["schools/school_B001",{status:"active",name:"School B"}]
]);
const readPaths=[];
const firestore={doc:path=>({get:async()=>{readPaths.push(path);return {exists:records.has(path),data:()=>records.get(path)};}})};
const auth={verifyIdToken:async(token,revoked)=>{assert.equal(revoked,true);if(token!=="valid")throw Error("Invalid token");return {uid:"user1",firebase:{sign_in_provider:"password"}};}};
const handler=createV47DashboardHttpHandler({auth,firestore});
const req={method:"GET",headers:{authorization:"Bearer valid"},query:{schoolId:"school_A001"}};
assert.deepEqual(await handler(req),{status:200,body:{dashboard:{schoolId:"school_A001",schoolName:"School A",roles:["viewer"],readOnly:true}}});
assert.equal((await handler({...req,query:{schoolId:"school_B001"}})).status,403);
assert.equal((await handler({...req,query:{schoolId:"school_A001",uid:"user2"}})).status,400);
assert.equal((await handler({...req,headers:{}})).status,401);
assert.equal((await handler({...req,method:"POST"})).status,405);
records.set("schools/school_A001",{status:"suspended",name:"School A"});
assert.equal((await handler(req)).status,403);
assert.ok(readPaths.every(path=>path.startsWith("schools/")),"No root V46 data reads");
console.log("V47 selected school dashboard HTTP tests passed");
