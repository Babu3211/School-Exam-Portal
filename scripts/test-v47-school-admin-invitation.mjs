import assert from "node:assert/strict";
import {inviteSchoolAdmin} from "../src/v47/school-admin-invitation.mjs";
const base={"platform_admins/root":{active:true},"schools/school_A001":{adminEmail:"admin@example.com"}};
function mock(initial=base) {
 const docs=new Map(Object.entries(initial));let audit=0;
 const firestore={doc:path=>({path}),collection:path=>({doc:()=>({path:path+"/"+(++audit)})}),async runTransaction(fn){
  const writes=[];const tx={get:async r=>({exists:docs.has(r.path),data:()=>docs.get(r.path)}),create:(r,data)=>writes.push([r.path,data,"create"]),update:(r,data)=>writes.push([r.path,data,"update"])};
  await fn(tx);for(const [path,value,operation] of writes){if(operation==="create" && docs.has(path))throw Error("Duplicate");if(operation==="update" && !docs.has(path))throw Error("Missing");docs.set(path,operation==="update"?{...docs.get(path),...value}:value);}
 }};
 const auth={getUserByEmail:async email=>email==="admin@example.com"?{uid:"schoolAdmin1",disabled:false}:null};
 return {docs,firestore,auth};
}
const actor={uid:"root",verifiedSuperAdmin:true},schoolId="school_A001",adminEmail="admin@example.com";
const m=mock();
const result=await inviteSchoolAdmin({actor,schoolId,adminEmail,firestore:m.firestore,auth:m.auth,now:new Date("2026-11-13T00:00:00Z")});
assert.equal(result.adminUid,"schoolAdmin1");
assert.deepEqual(m.docs.get("schools/school_A001/members/schoolAdmin1").roles,["school_admin"]);
assert.deepEqual(m.docs.get("v47_user_school_index/schoolAdmin1").memberships.map(x=>x.schoolId),["school_A001"]);
await assert.rejects(inviteSchoolAdmin({actor,schoolId,adminEmail,firestore:m.firestore,auth:m.auth}),/already exists/);
const existing=mock({...base,"v47_user_school_index/schoolAdmin1":{memberships:[{uid:"schoolAdmin1",schoolId:"school_B001",roles:["viewer"],active:true}]}});
await inviteSchoolAdmin({actor,schoolId,adminEmail,firestore:existing.firestore,auth:existing.auth});
assert.deepEqual(existing.docs.get("v47_user_school_index/schoolAdmin1").memberships.map(x=>x.schoolId),["school_B001","school_A001"]);
const revoked=mock({...base,"platform_admins/root":{active:false}});
await assert.rejects(inviteSchoolAdmin({actor,schoolId,adminEmail,firestore:revoked.firestore,auth:revoked.auth}),/revoked/);
const bad=mock();
await assert.rejects(inviteSchoolAdmin({actor,schoolId,adminEmail:"other@example.com",firestore:bad.firestore,auth:bad.auth}),/Active Auth user/);
assert.equal([...bad.docs.keys()].filter(x=>x.includes("/members/")).length,0);
await assert.rejects(inviteSchoolAdmin({actor:{uid:"root",verifiedSuperAdmin:false},schoolId,adminEmail,firestore:m.firestore,auth:m.auth}),/super admin/);
console.log("V47 school admin invitation mock tests passed");
