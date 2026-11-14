import assert from "node:assert/strict";
import {createV47ExamReadClient} from "../src/v47/marks-attendance-client.mjs";
const calls=[];
const client=createV47ExamReadClient({
 getIdToken:async()=>"token",
 fetchImpl:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>url.includes("/marks?")?{marks:[{id:"m1",score:80}]}:{attendance:[{id:"a1",students:[]}]}};
 }
});
assert.deepEqual(await client.readMarks({schoolId:"school_A001",className:"9",subject:"Computer"}),[{id:"m1",score:80}]);
assert.deepEqual(await client.readAttendance({schoolId:"school_A001",className:"9",date:"2083-01-01"}),[{id:"a1",students:[]}]);
assert.ok(calls[0].url.startsWith("/api/v47/marks?"));
assert.ok(calls[1].url.startsWith("/api/v47/attendance?"));
assert.equal(calls[0].options.headers.Authorization,"Bearer token");
assert.equal(calls[1].options.cache,"no-store");
await assert.rejects(client.readMarks({schoolId:"school_A001",className:"9",subject:"Computer",uid:"forged"}),/Invalid query/);
assert.equal(calls.length,2);
const denied=createV47ExamReadClient({getIdToken:async()=>"token",fetchImpl:async()=>({ok:false})});
await assert.rejects(denied.readAttendance({schoolId:"school_B001",className:"9",date:"2083-01-01"}),/access denied/);
console.log("V47 browser marks attendance read client tests passed");
