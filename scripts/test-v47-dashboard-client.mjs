import assert from "node:assert/strict";
import {createV47DashboardClient} from "../src/v47/dashboard-client.mjs";
const calls=[];
const client=createV47DashboardClient({
 getIdToken:async()=>"firebase-token",
 fetchImpl:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({dashboard:{schoolId:"school_A001",schoolName:"School A",roles:["viewer"],readOnly:true,annualFeeNpr:1000}})};
 }
});
assert.deepEqual(await client.loadSchool("school_A001"),{
 schoolId:"school_A001",schoolName:"School A",roles:["viewer"],readOnly:true
});
assert.equal(calls[0].url,"/api/v47/dashboard?schoolId=school_A001");
assert.equal(calls[0].options.headers.Authorization,"Bearer firebase-token");
assert.equal(calls[0].options.cache,"no-store");
assert.equal(calls[0].options.credentials,"same-origin");
await assert.rejects(client.loadSchool("../school_B001"),/Invalid school ID/);
assert.equal(calls.length,1);
const denied=createV47DashboardClient({getIdToken:async()=>"valid",fetchImpl:async()=>({ok:false,status:403})});
await assert.rejects(denied.loadSchool("school_B001"),/access denied/);
const forged=createV47DashboardClient({getIdToken:async()=>"valid",fetchImpl:async()=>({ok:true,json:async()=>({dashboard:{schoolId:"school_B001",schoolName:"Other",roles:["school_admin"],readOnly:false}})})});
await assert.rejects(forged.loadSchool("school_A001"),/Invalid dashboard response/);
for(const dashboard of [
 {schoolId:"school_A001",schoolName:"A",roles:["viewer"],readOnly:false},
 {schoolId:"school_A001",schoolName:"A",roles:["school_admin","viewer"],readOnly:false},
 {schoolId:"school_A001",schoolName:"A",roles:["unknown"],readOnly:true},
 {schoolId:"school_A001",schoolName:"A",roles:[],readOnly:true}
]){
 const malformed=createV47DashboardClient({getIdToken:async()=>"token",fetchImpl:async()=>({ok:true,json:async()=>({dashboard})})});
 await assert.rejects(malformed.loadSchool("school_A001"),/Invalid dashboard response/);
}
assert.throws(()=>createV47DashboardClient({getIdToken:async()=>"",fetchImpl:async()=>{},endpoint:"https://evil.example/api"}),/Same-origin/);
console.log("V47 browser dashboard client tests passed");
