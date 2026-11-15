import assert from "node:assert/strict";
import {Readable} from "node:stream";
import {createV47NodeOnboardingHandler} from "../src/v47/node-onboarding-handler.mjs";
let verified=0;
const auth={verifyIdToken:async()=>{verified++;return {uid:"platform-admin",firebase:{sign_in_provider:"password"}};}};
const firestore={runTransaction:async()=>{throw Error("Not configured for test");},doc:()=>({get:async()=>({exists:false})})};
const handle=createV47NodeOnboardingHandler({auth,firestore});
async function request(url,method="POST",body={},headers={}){
 const req=Readable.from([Buffer.from(JSON.stringify(body))]);
 req.url=url;req.method=method;req.headers=headers;
 const res={statusCode:200,writableEnded:false,setHeader(){},end(value){this.body=JSON.parse(value);this.writableEnded=true;}};
 await handle(req,res);
 return res;
}
const register="/api/v47/platform/schools/register";
const invite="/api/v47/platform/schools/invite-admin";
assert.equal((await request(register,"GET")).statusCode,405);
assert.equal((await request(register,"POST",{})).statusCode,401);
assert.equal((await request(register,"POST",{}, {authorization:"Bearer token","content-type":"text/plain"})).statusCode,415);
assert.equal((await request(register,"POST",{verifiedSuperAdmin:true},{authorization:"Bearer token","content-type":"application/json"})).statusCode,400);
assert.equal((await request(invite,"POST",{schoolId:"school_A001",adminEmail:"admin@example.com",roles:["school_admin"]},{authorization:"Bearer token","content-type":"application/json"})).statusCode,400);
assert.equal((await request("/api/v47/platform/schools/unknown")).statusCode,404);
assert.equal(verified,0,"Malformed requests must not reach authentication or Firestore");
const response=await request(register,"POST",{input:{schoolId:"school_A001",name:"Test School",iemisCode:"12345",adminEmail:"admin@example.com"}},{authorization:"Bearer token","content-type":"application/json"});
assert.equal(response.statusCode,403,"Unconfigured trusted backend must fail closed");
assert.equal(verified,1);
console.log("V47 trusted onboarding HTTP boundary tests passed");
