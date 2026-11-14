import assert from "node:assert/strict";
import {writeVerifiedStudent} from "../src/v47/verified-student-writer.mjs";
function setup(role="school_admin"){
 const docs=new Map(Object.entries({
  "schools/school_A001":{status:"active"},
  "schools/school_A001/members/user1":{uid:"user1",schoolId:"school_A001",active:true,roles:[role]},
  "schools/school_B001":{status:"active"}
 }));
 let audit=0;
 const firestore={
  doc:path=>({path,get:async()=>({exists:docs.has(path),data:()=>docs.get(path)})}),
  collection:path=>({doc:()=>({path:path+"/"+(++audit)})}),
  async runTransaction(fn){const writes=[];const tx={
   get:async ref=>({exists:docs.has(ref.path),data:()=>docs.get(ref.path)}),
   create:(ref,data)=>writes.push(["create",ref.path,data]),
   update:(ref,data)=>writes.push(["update",ref.path,data])
  };await fn(tx);for(const [op,path,data] of writes){if(op==="create"&&docs.has(path))throw Error("Duplicate");docs.set(path,op==="update"?{...docs.get(path),...data}:data);}}
 };
 return {docs,firestore,auth:{verifyIdToken:async()=>({uid:"user1"})}};
}
const a=setup(),base={idToken:"token",schoolId:"school_A001",studentId:"s001",auth:a.auth,firestore:a.firestore};
await writeVerifiedStudent({...base,mode:"create",values:{name:"Test",className:"9"}});
assert.equal(a.docs.get("schools/school_A001/students/s001").name,"Test");
await writeVerifiedStudent({...base,mode:"update",values:{section:"A"}});
assert.equal(a.docs.get("schools/school_A001/students/s001").className,"9");
assert.equal(a.docs.get("schools/school_A001/students/s001").section,"A");
await assert.rejects(()=>writeVerifiedStudent({...base,mode:"create",values:{name:"Duplicate",className:"9"}}),/exists/);
await assert.rejects(()=>writeVerifiedStudent({...base,mode:"update",values:{roles:"admin"}}),/privileged/);
await assert.rejects(()=>writeVerifiedStudent({...base,mode:"update",values:{nameNepali:"विद्यार्थी"}}),/privileged/);
await assert.rejects(()=>writeVerifiedStudent({...base,mode:"update",values:{name:"विद्यार्थी"}}),/English letters/);
await writeVerifiedStudent({...base,mode:"update",values:{name:"Ram Bahadur Thapa"}});
assert.equal(a.docs.get("schools/school_A001/students/s001").name,"Ram Bahadur Thapa");
await assert.rejects(()=>writeVerifiedStudent({...base,mode:"update",values:{name:"   "}}),/cannot be blank/);
await assert.rejects(()=>writeVerifiedStudent({...base,mode:"update",values:{className:"  "}}),/cannot be blank/);
assert.equal(a.docs.get("schools/school_A001/students/s001").name,"Ram Bahadur Thapa");
assert.equal(a.docs.get("schools/school_A001/students/s001").className,"9");
await assert.rejects(()=>writeVerifiedStudent({...base,schoolId:"school_B001",mode:"update",values:{name:"Bad"}}),/membership/i);
const viewer=setup("viewer");
await assert.rejects(()=>writeVerifiedStudent({...base,auth:viewer.auth,firestore:viewer.firestore,mode:"create",values:{name:"Test",className:"9"}}),/School admin/);
assert.equal(viewer.docs.has("schools/school_A001/students/s001"),false);
const mixed=setup();
mixed.docs.set("schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:true,roles:["school_admin","viewer"]});
await assert.rejects(()=>writeVerifiedStudent({...base,auth:mixed.auth,firestore:mixed.firestore,mode:"create",values:{name:"Blocked",className:"9"}}),/School admin required/);
assert.equal(mixed.docs.has("schools/school_A001/students/s001"),false);
const revoked=setup();
const originalTransaction=revoked.firestore.runTransaction;
revoked.firestore.runTransaction=async fn=>{
 revoked.docs.set("schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:false,roles:["school_admin"]});
 return originalTransaction(fn);
};
await assert.rejects(()=>writeVerifiedStudent({...base,auth:revoked.auth,firestore:revoked.firestore,mode:"create",values:{name:"Blocked",className:"9"}}),/authorization changed/);
assert.equal(revoked.docs.has("schools/school_A001/students/s001"),false);
const inactiveSchool=setup();
const inactiveRun=inactiveSchool.firestore.runTransaction;
inactiveSchool.firestore.runTransaction=async fn=>{
 inactiveSchool.docs.set("schools/school_A001",{status:"suspended"});
 return inactiveRun(fn);
};
await assert.rejects(()=>writeVerifiedStudent({...base,auth:inactiveSchool.auth,firestore:inactiveSchool.firestore,mode:"create",values:{name:"Blocked",className:"9"}}),/authorization changed/);
assert.equal(inactiveSchool.docs.has("schools/school_A001/students/s001"),false);
assert.equal([...inactiveSchool.docs.keys()].filter(key=>key.startsWith("schools/school_A001/audit_logs/")).length,0);
const roleRemoved=setup();
const roleRun=roleRemoved.firestore.runTransaction;
roleRemoved.firestore.runTransaction=async fn=>{
 roleRemoved.docs.set("schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:true,roles:["viewer"]});
 return roleRun(fn);
};
await assert.rejects(()=>writeVerifiedStudent({...base,auth:roleRemoved.auth,firestore:roleRemoved.firestore,mode:"create",values:{name:"Blocked",className:"9"}}),/authorization changed/);
assert.equal(roleRemoved.docs.has("schools/school_A001/students/s001"),false);
assert.equal([...roleRemoved.docs.keys()].filter(key=>key.startsWith("schools/school_A001/audit_logs/")).length,0);
// A previously authorized admin must not modify an existing student after revocation.
const updateRevoked=setup();
const existingPath="schools/school_A001/students/s001";
updateRevoked.docs.set(existingPath,{name:"Original",className:"9",section:"A"});
const updateRun=updateRevoked.firestore.runTransaction;
updateRevoked.firestore.runTransaction=async fn=>{
 updateRevoked.docs.set("schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:false,roles:["school_admin"]});
 return updateRun(fn);
};
await assert.rejects(()=>writeVerifiedStudent({...base,auth:updateRevoked.auth,firestore:updateRevoked.firestore,mode:"update",values:{name:"Unauthorized"}}),/authorization changed/);
assert.deepEqual(updateRevoked.docs.get(existingPath),{name:"Original",className:"9",section:"A"});
assert.equal([...updateRevoked.docs.keys()].filter(key=>key.startsWith("schools/school_A001/audit_logs/")).length,0);
// Reject a membership whose tenant or identity changes between verification and commit.
for(const mismatch of [{schoolId:"school_B001",uid:"user1"},{schoolId:"school_A001",uid:"imposter"}]){
 const fixture=setup();
 const original=fixture.firestore.runTransaction;
 fixture.firestore.runTransaction=async fn=>{
  fixture.docs.set("schools/school_A001/members/user1",{...mismatch,active:true,roles:["school_admin"]});
  return original(fn);
 };
 await assert.rejects(()=>writeVerifiedStudent({...base,auth:fixture.auth,firestore:fixture.firestore,mode:"create",values:{name:"Blocked",className:"9"}}),/authorization changed/);
 assert.equal(fixture.docs.has("schools/school_A001/students/s001"),false);
 assert.equal([...fixture.docs.keys()].filter(key=>key.startsWith("schools/school_A001/audit_logs/")).length,0);
}
// Viewer added to an admin membership during the transaction must revoke writes.
const viewerAdded=setup();
const viewerAddedRun=viewerAdded.firestore.runTransaction;
viewerAdded.firestore.runTransaction=async fn=>{
 viewerAdded.docs.set("schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:true,roles:["school_admin","viewer"]});
 return viewerAddedRun(fn);
};
await assert.rejects(()=>writeVerifiedStudent({...base,auth:viewerAdded.auth,firestore:viewerAdded.firestore,mode:"create",values:{name:"Blocked",className:"9"}}),/authorization changed/);
assert.equal(viewerAdded.docs.has("schools/school_A001/students/s001"),false);
assert.equal([...viewerAdded.docs.keys()].filter(key=>key.startsWith("schools/school_A001/audit_logs/")).length,0);
// A corrupted role string must not pass an array membership check during commit.
const malformedRoles=setup();
const malformedRun=malformedRoles.firestore.runTransaction;
malformedRoles.firestore.runTransaction=async fn=>{
 malformedRoles.docs.set("schools/school_A001/members/user1",{uid:"user1",schoolId:"school_A001",active:true,roles:"school_admin"});
 return malformedRun(fn);
};
await assert.rejects(()=>writeVerifiedStudent({...base,auth:malformedRoles.auth,firestore:malformedRoles.firestore,mode:"create",values:{name:"Blocked",className:"9"}}),/authorization changed/);
assert.equal(malformedRoles.docs.has("schools/school_A001/students/s001"),false);
assert.equal([...malformedRoles.docs.keys()].filter(key=>key.startsWith("schools/school_A001/audit_logs/")).length,0);
const wrongTenant=setup();
wrongTenant.docs.set("schools/school_A001/students/s001",{schoolId:"school_B001",name:"Protected",className:"9"});
await assert.rejects(()=>writeVerifiedStudent({...base,auth:wrongTenant.auth,firestore:wrongTenant.firestore,mode:"update",values:{name:"Overwrite"}}),/tenant identity mismatch/);
assert.equal(wrongTenant.docs.get("schools/school_A001/students/s001").name,"Protected");
assert.equal([...wrongTenant.docs.keys()].filter(key=>key.startsWith("schools/school_A001/audit_logs/")).length,0);
assert.ok([...a.docs.keys()].some(key=>key.startsWith("schools/school_A001/audit_logs/")));
console.log("V47 verified student writer tenant, viewer, revoked membership, suspended school, role downgrade and audit tests passed");
