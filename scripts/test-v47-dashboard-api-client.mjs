import assert from "node:assert/strict";
import {createV47DashboardClient} from "../src/v47/dashboard-api-client.mjs";
const urls=[];
const client=createV47DashboardClient({
 getIdToken:async()=>"valid-token",
 fetchImpl:async(url,options)=>{
  urls.push([url,options.headers.Authorization,options.cache]);
  const schoolId=new URL(url,"https://staging.example").searchParams.get("schoolId");
  return {ok:true,json:async()=>schoolId
   ?{dashboard:{schoolId,schoolName:schoolId,roles:["viewer"],readOnly:true}}
   :{schools:[{schoolId:"school_A001"},{schoolId:"school_B001"}]}};
 }
});
assert.equal((await client.schools()).length,2);
assert.equal((await client.selectSchool("school_A001")).schoolId,"school_A001");
assert.equal((await client.selectSchool("school_B001")).schoolId,"school_B001");
assert.equal(client.selectedSchoolId,"school_B001");
assert.equal(urls.length,3);
assert.ok(urls.every(([,auth,cache])=>auth==="Bearer valid-token"&&cache==="no-store"));
await assert.rejects(()=>client.selectSchool("../invalid"),/Invalid school ID/);
assert.equal(client.selectedSchoolId,null);
let finish;
const delayed=createV47DashboardClient({
 getIdToken:async()=>"token",
 fetchImpl:async(url)=>({ok:true,json:()=>new Promise(resolve=>{finish=()=>resolve({dashboard:{schoolId:"school_A001"}});})})
});
const pending=delayed.selectSchool("school_A001");
await new Promise(resolve=>setImmediate(resolve));
delayed.clear();
finish();
await assert.rejects(()=>pending,/School selection changed/);
assert.equal(delayed.selectedSchoolId,null);
const mismatched=createV47DashboardClient({
 getIdToken:async()=>"token",
 fetchImpl:async()=>({ok:true,json:async()=>({dashboard:{schoolId:"school_B001"}})})
});
await assert.rejects(()=>mismatched.selectSchool("school_A001"),/School identity mismatch/);
console.log("V47 authenticated dashboard API client isolation and stale-response tests passed");
