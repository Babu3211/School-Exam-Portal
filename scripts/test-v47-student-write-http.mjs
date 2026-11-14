import assert from "node:assert/strict";
import {Readable} from "node:stream";
import {createV47NodeStudentWriteHandler} from "../src/v47/node-student-write-handler.mjs";
const docs=new Map(Object.entries({
 "schools/school_A001":{status:"active"},
 "schools/school_A001/members/user1":{uid:"user1",schoolId:"school_A001",active:true,roles:["school_admin"]}
}));
let serial=0;
const firestore={
 doc:path=>({path,get:async()=>({exists:docs.has(path),data:()=>docs.get(path)})}),
 collection:path=>({doc:()=>({path:path+"/"+(++serial)})}),
 runTransaction:async fn=>{
  const ops=[],tx={
   get:async ref=>({exists:docs.has(ref.path),data:()=>docs.get(ref.path)}),
   create:(ref,data)=>ops.push([ref.path,data]),
   update:(ref,data)=>ops.push([ref.path,{...docs.get(ref.path),...data}])
  };
  await fn(tx);
  for(const [path,data] of ops)docs.set(path,data);
 }
};
const handle=createV47NodeStudentWriteHandler({auth:{verifyIdToken:async()=>({uid:"user1"})},firestore});
async function call(url,method,body,headers={}) {
 const req=Readable.from([typeof body==="string"?body:JSON.stringify(body||{})]);
 req.url=url;req.method=method;req.headers=headers;
 const res={setHeader(){},end(text){this.body=JSON.parse(text);}};
 await handle(req,res);
 return res;
}
const headers={"content-type":"application/json",authorization:"Bearer valid"};
const payload={schoolId:"school_A001",studentId:"s001",mode:"create",values:{name:"Test",className:"9"}};
assert.equal((await call("/api/v47/students/write","POST",payload,headers)).statusCode,200);
assert.equal(docs.get("schools/school_A001/students/s001").name,"Test");
assert.equal((await call("/api/v47/students/write","POST",payload,headers)).statusCode,403);
assert.equal((await call("/api/v47/students/write","POST",{...payload,schoolId:"school_B001"},headers)).statusCode,403);
assert.equal((await call("/api/v47/students/write","POST",payload,{"content-type":"application/json"})).statusCode,401);
assert.equal((await call("/api/v47/students/write","GET",payload,headers)).statusCode,405);
assert.equal((await call("/api/v47/students/write","POST","x".repeat(16385),headers)).statusCode,413);
assert.equal((await call("/api/v47/students/write","POST","{",headers)).statusCode,400);
console.log("V47 isolated student write HTTP adapter tests passed");
