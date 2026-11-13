import assert from "node:assert/strict";
import {createV47MarksHttpHandler} from "../src/v47/marks-http-handler.mjs";
const docs=new Map([["schools/school_A001",{status:"active"}],["schools/school_A001/members/user1",{active:true,roles:["viewer"]}],["schools/school_B001",{status:"active"}]]);
const queries=[];
const firestore={
 doc:path=>({get:async()=>({exists:docs.has(path),data:()=>docs.get(path)})}),
 collection:path=>({where(field,op,value){queries.push([path,field,op,value]);return this;},async get(){return {docs:[{id:"mark1",data:()=>({score:81})}]};}})
};
const auth={verifyIdToken:async(token,revoked)=>{assert.equal(revoked,true);if(token!=="valid")throw Error("Invalid token");return {uid:"user1",firebase:{sign_in_provider:"password"}};}};
const handler=createV47MarksHttpHandler({auth,firestore});
const request={method:"GET",headers:{authorization:"Bearer valid"},query:{schoolId:"school_A001",className:"9",subject:"Computer"}};
assert.deepEqual(await handler(request),{status:200,body:{marks:[{id:"mark1",score:81}]}});
assert.equal(queries.length,2);
assert.equal((await handler({...request,method:"POST"})).status,405);
assert.equal((await handler({...request,headers:{}})).status,401);
assert.equal((await handler({...request,headers:{authorization:"Bearer bad"}})).status,403);
assert.equal((await handler({...request,query:{...request.query,schoolId:"school_B001"}})).status,403);
docs.set("schools/school_A001",{status:"suspended"});
assert.equal((await handler(request)).status,403);
assert.equal(queries.length,2,"Rejected requests must not query marks");
console.log("V47 authenticated marks HTTP handler tests passed");
