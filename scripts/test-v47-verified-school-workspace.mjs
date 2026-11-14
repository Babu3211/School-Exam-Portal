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
app.clear();
assert.equal(app.getSelectedSchool(),null);
assert.equal(app.getAvailableSchools(),null);
await assert.rejects(()=>app.selectSchool("school_A001"),/verified membership/);
console.log("V47 verified chooser and school workspace integration passed");
