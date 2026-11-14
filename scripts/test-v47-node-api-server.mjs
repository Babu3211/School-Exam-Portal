import assert from "node:assert/strict";
import {once} from "node:events";
import {createV47ApiServer} from "../src/v47/node-api-server.mjs";
const docs=new Map(Object.entries({
 "schools/school_A001":{status:"active"},
 "schools/school_A001/members/user1":{uid:"user1",schoolId:"school_A001",active:true,roles:["school_admin"]}
}));
let counter=0;
const firestore={
 doc:path=>({path,get:async()=>({exists:docs.has(path),data:()=>docs.get(path)})}),
 collection:path=>({
  doc:()=>({path:path+"/"+(++counter)}),
  limit:n=>({get:async()=>({docs:[{id:"student1",data:()=>({name:"Existing"})}]})})
 }),
 runTransaction:async fn=>{
  const operations=[];
  const tx={
   get:async ref=>({exists:docs.has(ref.path),data:()=>docs.get(ref.path)}),
   create:(ref,data)=>operations.push([ref.path,data]),
   update:(ref,data)=>operations.push([ref.path,{...docs.get(ref.path),...data}])
  };
  await fn(tx);
  for(const [path,data] of operations)docs.set(path,data);
 }
};
const server=createV47ApiServer({auth:{verifyIdToken:async()=>({uid:"user1"})},firestore});
try{
 server.listen(0,"127.0.0.1");
 await once(server,"listening");
 const base="http://127.0.0.1:"+server.address().port;
 const headers={authorization:"Bearer token","content-type":"application/json"};
 const read=await fetch(base+"/api/v47/records?schoolId=school_A001&collection=students",{headers});
 assert.equal(read.status,200);
 assert.equal((await read.json()).records[0].id,"student1");
 const create=await fetch(base+"/api/v47/students/write",{method:"POST",headers,body:JSON.stringify({
  schoolId:"school_A001",studentId:"s001",mode:"create",values:{name:"Test",className:"9"}
 })});
 assert.equal(create.status,200);
 assert.equal(docs.get("schools/school_A001/students/s001").name,"Test");
 const denied=await fetch(base+"/api/v47/students/write",{method:"POST",headers,body:JSON.stringify({
  schoolId:"school_B001",studentId:"s002",mode:"create",values:{name:"Blocked",className:"9"}
 })});
 assert.equal(denied.status,403);
 assert.equal(docs.has("schools/school_B001/students/s002"),false);
 const method=await fetch(base+"/api/v47/records",{method:"POST",headers,body:"{}"});
 assert.equal(method.status,405);
 console.log("V47 unified real Node API integration passed");
}finally{
 await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
}
