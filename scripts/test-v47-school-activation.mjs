import assert from "node:assert/strict";
import {activateSchoolFromVerifiedToken} from "../src/v47/school-activation.mjs";
function setup(subscriptionStatus="free",memberActive=true){
 const data=new Map(Object.entries({
  "platform_admins/root":{active:true},
  "schools/school_A001":{status:"pending",adminEmail:"admin@example.com",subscriptionStatus},
  "v47_school_admin_index/school_A001":{adminUid:"teacher1"},
  "schools/school_A001/members/teacher1":{active:memberActive,roles:["school_admin"]}
 }));
 let audit=0;
 const firestore={doc:path=>({path,get:async()=>({exists:data.has(path),data:()=>data.get(path)})}),collection:path=>({doc:()=>({path:path+"/"+(++audit)})}),async runTransaction(fn){
  const writes=[];
  const tx={get:async ref=>({exists:data.has(ref.path),data:()=>data.get(ref.path)}),update:(ref,patch)=>writes.push(["update",ref.path,patch]),create:(ref,value)=>writes.push(["create",ref.path,value])};
  await fn(tx);
  for(const [op,path,value] of writes)data.set(path,op==="update"?{...data.get(path),...value}:value);
 }};
 return {data,firestore,auth:{verifyIdToken:async()=>({uid:"root"})}};
}
const valid=setup();
assert.equal((await activateSchoolFromVerifiedToken({idToken:"token",schoolId:"school_A001",auth:valid.auth,firestore:valid.firestore})).status,"active");
assert.equal(valid.data.get("schools/school_A001").status,"active");
await assert.rejects(()=>activateSchoolFromVerifiedToken({idToken:"token",schoolId:"school_A001",auth:valid.auth,firestore:valid.firestore}),/pending/);
const unpaid=setup("due");
await assert.rejects(()=>activateSchoolFromVerifiedToken({idToken:"token",schoolId:"school_A001",auth:unpaid.auth,firestore:unpaid.firestore}),/subscription/);
assert.equal(unpaid.data.get("schools/school_A001").status,"pending");
const missing=setup("free",false);
await assert.rejects(()=>activateSchoolFromVerifiedToken({idToken:"token",schoolId:"school_A001",auth:missing.auth,firestore:missing.firestore}),/Active school admin/);
console.log("V47 school activation security tests passed");
