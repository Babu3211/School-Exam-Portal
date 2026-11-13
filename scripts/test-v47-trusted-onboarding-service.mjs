import assert from "node:assert/strict";
import {registerSchoolFromVerifiedToken,inviteSchoolAdminFromVerifiedToken} from "../src/v47/trusted-onboarding-service.mjs";
const docs=new Map([["platform_admins/root",{active:true}]]);
let count=0;
const firestore={
 doc:path=>({path,get:async()=>({exists:docs.has(path),data:()=>docs.get(path)})}),
 collection:path=>({doc:()=>({path:path+"/"+(++count)})}),
 async runTransaction(callback){
  const writes=[];
  const tx={get:async ref=>({exists:docs.has(ref.path),data:()=>docs.get(ref.path)}),create:(ref,data)=>writes.push([ref.path,data])};
  await callback(tx);
  for(const [path,data] of writes){if(docs.has(path))throw Error("duplicate");docs.set(path,data);}
 }
};
const auth={
 verifyIdToken:async(token,checkRevoked)=>{assert.equal(checkRevoked,true);if(token!=="good")throw Error("Invalid token");return {uid:"root",firebase:{sign_in_provider:"password"}};},
 getUserByEmail:async email=>email==="admin@example.com"?{uid:"admin1",disabled:false}:null
};
const input={schoolId:"school_A001",name:"Synthetic School",iemisCode:"TEST123",adminEmail:"admin@example.com",annualFee:3000};
await assert.rejects(registerSchoolFromVerifiedToken({idToken:"bad",input,auth,firestore}),/Invalid token/);
assert.equal(docs.has("schools/school_A001"),false);
const created=await registerSchoolFromVerifiedToken({idToken:"good",input,auth,firestore});
assert.equal(created.schoolId,"school_A001");
await assert.rejects(inviteSchoolAdminFromVerifiedToken({idToken:"bad",schoolId:"school_A001",adminEmail:"admin@example.com",auth,firestore}),/Invalid token/);
assert.equal(docs.has("schools/school_A001/members/admin1"),false);
const invited=await inviteSchoolAdminFromVerifiedToken({idToken:"good",schoolId:"school_A001",adminEmail:"admin@example.com",auth,firestore});
assert.equal(invited.adminUid,"admin1");
assert.deepEqual(docs.get("schools/school_A001/members/admin1").roles,["school_admin"]);
console.log("V47 verified-token onboarding integration mock tests passed");
