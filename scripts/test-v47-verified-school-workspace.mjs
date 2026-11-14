import assert from "node:assert/strict";
import {createV47VerifiedSchoolWorkspace} from "../src/v47/verified-school-workspace.mjs";
const requests=[];
const app=createV47VerifiedSchoolWorkspace({
 getIdToken:async()=>"token",
 bsToAd:()=> "2026-11-14",
 fetchImpl:async(url)=>{
  requests.push(url);
  if(url==="/api/v47/schools")return {ok:true,json:async()=>({schools:[{schoolId:"school_A001",schoolName:"A",roles:["viewer"]}]})};
  if(url==="/api/v47/dashboard?schoolId=school_A001")return {ok:true,json:async()=>({dashboard:{schoolId:"school_A001",schoolName:"A",roles:["viewer"],readOnly:true}})};
  throw new Error("Unexpected request "+url);
 }
});
await assert.rejects(()=>app.selectSchool("school_A001"),/verified membership/);
assert.equal((await app.loadSchools()).length,1);
await assert.rejects(()=>app.selectSchool("school_B001"),/verified membership/);
assert.equal(requests.length,1,"Unauthorized school must never trigger dashboard request");
assert.equal((await app.selectSchool("school_A001")).readOnly,true);
assert.equal(app.getSelectedSchool().schoolId,"school_A001");
await assert.rejects(()=>app.selectSchool("school_B001"),/verified membership/);
assert.equal(app.getSelectedSchool(),null,"Invalid switch must not retain prior school access");
assert.equal(requests.length,2,"Invalid school must not request a dashboard");
app.clear();
assert.equal(app.getSelectedSchool(),null);
assert.equal(app.getAvailableSchools(),null);
await assert.rejects(()=>app.selectSchool("school_A001"),/verified membership/);
// A stale dashboard response must never erase a newer selected school.
let releaseOld;
const oldResponse=new Promise(resolve=>{releaseOld=resolve;});
let dashboardCalls=0;
const race=createV47VerifiedSchoolWorkspace({
 getIdToken:async()=>"token",
 bsToAd:()=> "2026-11-14",
 fetchImpl:async url=>{
  if(url==="/api/v47/schools")return {ok:true,json:async()=>({schools:[
   {schoolId:"school_A001",schoolName:"A",roles:["viewer"]},
   {schoolId:"school_B001",schoolName:"B",roles:["viewer"]}
  ]})};
  if(url==="/api/v47/dashboard?schoolId=school_A001"){
   dashboardCalls++;
   return oldResponse;
  }
  if(url==="/api/v47/dashboard?schoolId=school_B001")
   return {ok:true,json:async()=>({dashboard:{schoolId:"school_B001",schoolName:"B",roles:["viewer"],readOnly:true}})};
  throw Error("Unexpected request "+url);
 }
});
await race.loadSchools();
const stale=race.selectSchool("school_A001");
await race.loadSchools();
await race.selectSchool("school_B001");
releaseOld({ok:true,json:async()=>({dashboard:{schoolId:"school_A001",schoolName:"A",roles:["viewer"],readOnly:true}})});
await assert.rejects(stale,/School selection changed/);
assert.equal(dashboardCalls,1);
assert.equal(race.getSelectedSchool().schoolId,"school_B001");
console.log("V47 verified chooser and school workspace integration passed");
