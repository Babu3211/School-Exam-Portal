import assert from "node:assert/strict";
import {createV47SchoolsClient} from "../src/v47/schools-client.mjs";
let calls=[];
const client=createV47SchoolsClient({
 getIdToken:async()=>"idtoken",
 fetchImpl:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({schools:[{schoolId:"school_A001",schoolName:"School A",roles:["viewer"]}]})};
 }
});
const schools=await client.listSchools();
assert.equal(schools.length,1);
assert.equal(schools[0].schoolId,"school_A001");
assert.equal(calls[0].url,"/api/v47/schools");
assert.equal(calls[0].options.headers.Authorization,"Bearer idtoken");
assert.equal(calls[0].options.cache,"no-store");
assert.throws(()=>schools.push("bad"),TypeError);
await assert.rejects(()=>createV47SchoolsClient({getIdToken:async()=>"",fetchImpl:async()=>({})}).listSchools(),/Login required/);
await assert.rejects(()=>createV47SchoolsClient({getIdToken:async()=>"token",fetchImpl:async()=>({ok:true,json:async()=>({schools:[{schoolId:"school_A001",schoolName:"A",roles:["viewer"]},{schoolId:"school_A001",schoolName:"B",roles:["viewer"]}]})})}).listSchools(),/Duplicate school/);
console.log("V47 authenticated school chooser client tests passed");
