import assert from "node:assert/strict";
import {once} from "node:events";
import {request as httpRequest} from "node:http";
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
 // Verify non-name Unicode fields survive a split UTF-8 HTTP request.
 const payload=Buffer.from(JSON.stringify({schoolId:"school_A001",studentId:"sUnicode",mode:"create",values:{name:"Test Student",className:"9",guardianName:"अभिभावक"}}),"utf8");
 const split=payload.indexOf(Buffer.from("अभिभावक","utf8"))+1;
 const chunkedStatus=await new Promise((resolve,reject)=>{
  const req=httpRequest(base+"/api/v47/students/write",{method:"POST",headers},res=>{
   res.resume();res.on("end",()=>resolve(res.statusCode));res.on("error",reject);
  });
  req.on("error",reject);
  req.write(payload.subarray(0,split));
  setImmediate(()=>req.end(payload.subarray(split)));
 });
 assert.equal(chunkedStatus,200);
 assert.equal(docs.get("schools/school_A001/students/sUnicode").guardianName,"अभिभावक");
 const denied=await fetch(base+"/api/v47/students/write",{method:"POST",headers,body:JSON.stringify({
  schoolId:"school_B001",studentId:"s002",mode:"create",values:{name:"Blocked",className:"9"}
 })});
 assert.equal(denied.status,403);
 assert.equal(docs.has("schools/school_B001/students/s002"),false);
 const crossSchoolRead=await fetch(base+"/api/v47/records?schoolId=school_B001&collection=students",{headers});
 assert.equal(crossSchoolRead.status,403,"An admin of school A cannot read school B");
 const invalidCollection=await fetch(base+"/api/v47/records?schoolId=school_A001&collection=user_roles",{headers});
 assert.equal(invalidCollection.status,403,"Server-managed roles must not be exposed as private records");
 // A user belonging to two schools may read only the explicitly selected school.
 docs.set("schools/school_B001",{status:"active"});
 docs.set("schools/school_B001/members/user1",{uid:"user1",schoolId:"school_B001",active:true,roles:["viewer"]});
 const schoolBRead=await fetch(base+"/api/v47/records?schoolId=school_B001&collection=students",{headers});
 assert.equal(schoolBRead.status,200);
 const schoolBWrite=await fetch(base+"/api/v47/students/write",{method:"POST",headers,body:JSON.stringify({
  schoolId:"school_B001",studentId:"schoolBViewerBlocked",mode:"create",values:{name:"Blocked Student",className:"9"}
 })});
 assert.equal(schoolBWrite.status,403);
 assert.equal(docs.has("schools/school_B001/students/schoolBViewerBlocked"),false);
 const schoolAAfterSwitch=await fetch(base+"/api/v47/records?schoolId=school_A001&collection=students",{headers});
 assert.equal(schoolAAfterSwitch.status,200);
 docs.delete("schools/school_B001/members/user1");
 const schoolBRevoked=await fetch(base+"/api/v47/records?schoolId=school_B001&collection=students",{headers});
 assert.equal(schoolBRevoked.status,403);
 // End-to-end HTTP regression: a viewer can read but cannot write.
 docs.set("schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:true,roles:["viewer"]});
 const viewerRead=await fetch(base+"/api/v47/records?schoolId=school_A001&collection=students",{headers});
 assert.equal(viewerRead.status,200);
 const viewerWrite=await fetch(base+"/api/v47/students/write",{method:"POST",headers,body:JSON.stringify({
  schoolId:"school_A001",studentId:"viewerBlocked",mode:"create",values:{name:"Blocked Student",className:"9"}
 })});
 assert.equal(viewerWrite.status,403);
 assert.equal(docs.has("schools/school_A001/students/viewerBlocked"),false);
 // Revocation must invalidate both reads and writes without requiring logout.
 docs.set("schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:false,roles:["school_admin"]});
 const revokedRead=await fetch(base+"/api/v47/records?schoolId=school_A001&collection=students",{headers});
 assert.equal(revokedRead.status,403);
 const revokedWrite=await fetch(base+"/api/v47/students/write",{method:"POST",headers,body:JSON.stringify({
  schoolId:"school_A001",studentId:"revokedBlocked",mode:"create",values:{name:"Blocked Student",className:"9"}
 })});
 assert.equal(revokedWrite.status,403);
 assert.equal(docs.has("schools/school_A001/students/revokedBlocked"),false);
 // Suspension must also prevent reads from a formerly authorized school.
 docs.set("schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:true,roles:["school_admin"]});
 docs.set("schools/school_A001",{status:"suspended"});
 const suspendedRead=await fetch(base+"/api/v47/records?schoolId=school_A001&collection=students",{headers});
 assert.equal(suspendedRead.status,403);
 const suspendedWrite=await fetch(base+"/api/v47/students/write",{method:"POST",headers,body:JSON.stringify({
  schoolId:"school_A001",studentId:"suspendedBlocked",mode:"create",values:{name:"Blocked Student",className:"9"}
 })});
 assert.equal(suspendedWrite.status,403);
 assert.equal(docs.has("schools/school_A001/students/suspendedBlocked"),false);
 // Platform onboarding endpoints must fail closed for ordinary school admins.
 // School-admin teacher assignment requires a verified tenant session.
 docs.set("schools/school_A001",{status:"active"});
 docs.set("schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:true,roles:["school_admin"]});
 docs.set("schools/school_A001/members/teacher1",{uid:"teacher1",schoolId:"school_A001",active:true,roles:["subject_teacher"]});
 const teacherPayload={input:{schoolId:"school_A001",teacherUid:"teacher1",classId:"9",subjectId:"computer",kind:"subject_teacher",terms:["first","final"]}};
 const teacherAssignment=await fetch(base+"/api/v47/teachers/assign",{method:"POST",headers,body:JSON.stringify(teacherPayload)});
 assert.equal(teacherAssignment.status,200);
 assert.equal(docs.get("schools/school_A001/assignments/teacher1_9_computer").classId,"9");
 docs.set("schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:true,roles:["viewer"]});
 const viewerAssignment=await fetch(base+"/api/v47/teachers/assign",{method:"POST",headers,body:JSON.stringify(teacherPayload)});
 assert.equal(viewerAssignment.status,403,"Viewer cannot assign teachers");
 docs.set("schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:true,roles:["school_admin"]});
 const crossTenantAssignment=await fetch(base+"/api/v47/teachers/assign",{method:"POST",headers,body:JSON.stringify({input:{...teacherPayload.input,schoolId:"school_B001"}})});
 assert.equal(crossTenantAssignment.status,403,"School A admin cannot assign teachers in school B");
 const registration=await fetch(base+"/api/v47/platform/schools/register",{
  method:"POST",headers,body:JSON.stringify({input:{
   schoolId:"school_C001",name:"New School",iemisCode:"900001",adminEmail:"owner@example.com"
  }})
 });
 assert.equal(registration.status,403,"School admin cannot register a new school");
 assert.equal(docs.has("schools/school_C001"),false);
 const invitation=await fetch(base+"/api/v47/platform/schools/invite-admin",{
  method:"POST",headers,body:JSON.stringify({schoolId:"school_A001",adminEmail:"owner@example.com"})
 });
 assert.equal(invitation.status,403,"School admin cannot invite platform-managed school admins");
 const method=await fetch(base+"/api/v47/records",{method:"POST",headers,body:"{}"});
 assert.equal(method.status,405);
 console.log("V47 unified real Node API integration passed");
}finally{
 await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
}
