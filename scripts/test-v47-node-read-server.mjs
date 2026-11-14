import assert from "node:assert/strict";
import {once} from "node:events";
import {createV47ReadServer} from "../src/v47/node-read-server.mjs";
const server=createV47ReadServer({
 auth:{verifyIdToken:async()=>({uid:"test"})},
 firestore:{doc:()=>({get:async()=>({exists:false})}),collection:()=>({})}
});
try {
 server.listen(0,"127.0.0.1");
 await once(server,"listening");
 const base="http://127.0.0.1:"+server.address().port;
 const cases=[
  ["/api/v47/dashboard?schoolId=school_001",401],
  ["/api/v47/marks?schoolId=school_001",401],
  ["/api/v47/attendance?schoolId=school_001",401],
  ["/api/v47/dashboard?schoolId=school_001&schoolId=school_002",400],
  ["/api/v47/unknown",404]
 ];
 for(const [path,status] of cases){
  const response=await fetch(base+path);
  assert.equal(response.status,status,path);
  assert.equal(response.headers.get("cache-control"),"no-store");
 }
 const post=await fetch(base+"/api/v47/dashboard",{method:"POST"});
 assert.equal(post.status,405);
 const forbidden=await fetch(base+"/api/v47/dashboard?schoolId=school_001",{headers:{authorization:"Bearer test"}});
 assert.equal(forbidden.status,403);
 console.log("V47 real Node HTTP read server integration tests passed");
}finally {
 await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
}
