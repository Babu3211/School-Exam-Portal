/**
 * Opt-in smoke test for a separately deployed V47 HTTPS staging API.
 * Never send credentials or writes. Reject the V46 production project.
 * Usage: V47_STAGING_API_ORIGIN=https://staging.example.org node scripts/test-v47-staging-smoke.mjs
 */
import assert from "node:assert/strict";
const raw=process.env.V47_STAGING_API_ORIGIN;
if(!raw)throw new Error("V47_STAGING_API_ORIGIN is required; no staging endpoint has been verified");
const origin=new URL(raw);
assert.equal(origin.protocol,"https:","Staging API must use HTTPS");
assert.equal(origin.username,"");
assert.equal(origin.password,"");
assert.equal(origin.pathname,"/");
assert.equal(origin.search,"");
assert.equal(origin.hash,"");
assert.ok(!["exam-portal-smss-95016.web.app","exam-portal-smss-95016.firebaseapp.com"].includes(origin.hostname),"V46 production forbidden");
assert.ok(!["localhost","127.0.0.1","0.0.0.0"].includes(origin.hostname),"Remote HTTPS staging required");
const cases=[
 {path:"/api/v47/students/write",method:"POST",status:401},
 {path:"/api/v47/teachers/assign",method:"POST",status:401},
 {path:"/api/v47/platform/schools/register",method:"POST",status:401},
 {path:"/api/v47/platform/schools/invite-admin",method:"POST",status:401}
];
for(const check of cases){
 const url=new URL(check.path,origin);
 const response=await fetch(url,{method:check.method,headers:{"content-type":"application/json"},body:"{}",redirect:"error",signal:AbortSignal.timeout(10000)});
 assert.equal(response.status,check.status,check.path+" must reject anonymous access");
 assert.match(response.headers.get("content-type")||"",/application\/json/);
 assert.match(response.headers.get("cache-control")||"",/no-store/);
 console.log(check.path+": anonymous access rejected");
}
console.log("V47 isolated staging anonymous-auth smoke checks passed. Authenticated flows and V46 parity still require manual validation.");
