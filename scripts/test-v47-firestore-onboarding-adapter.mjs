import assert from "node:assert/strict";
import {registerSchoolTransaction} from "../src/v47/firestore-onboarding-adapter.mjs";
const input={schoolId:"school_A001",name:"Synthetic School",iemisCode:"IEMIS_123",adminEmail:"admin@example.com",annualFee:5000};
function fakeFirestore(initial={}) {
 const docs=new Map(Object.entries(initial));let audit=0;
 const ref=path=>({path});
 const firestore={
  doc:ref,
  collection:path=>({doc:()=>ref(path+"/"+(++audit))}),
  async runTransaction(fn) {
   const writes=[];
   const tx={
    async get(r){return {exists:docs.has(r.path),data:()=>docs.get(r.path)};},
    create(r,data){writes.push([r.path,data]);}
   };
   const result=await fn(tx);
   for(const [path,data] of writes){if(docs.has(path))throw Error("Duplicate create");docs.set(path,data);}
   return result;
  }
 };
 return {firestore,docs};
}
const actor={uid:"super1",verifiedSuperAdmin:true};
const initial={"platform_admins/super1":{active:true}};
const {firestore,docs}=fakeFirestore(initial);
const result=await registerSchoolTransaction({actor,input,firestore,now:new Date("2026-11-13T00:00:00Z")});
assert.equal(result.schoolId,"school_A001");
assert.equal(docs.get("schools/school_A001").annualFeeNpr,5000);
assert.equal(docs.get("v47_iemis_index/IEMIS_123").schoolId,"school_A001");
assert.equal([...docs.keys()].filter(k=>k.startsWith("v47_registration_audit/")).length,1);
await assert.rejects(registerSchoolTransaction({actor,input,firestore}),/School ID already registered/);
assert.equal([...docs.keys()].filter(k=>k.startsWith("v47_registration_audit/")).length,1);
const {firestore:other}=fakeFirestore({...initial,"v47_iemis_index/IEMIS_123":{schoolId:"different"}});
await assert.rejects(registerSchoolTransaction({actor,input:{...input,schoolId:"school_B001"},firestore:other}),/IEMIS code already registered/);
const {firestore:revoked}=fakeFirestore({"platform_admins/super1":{active:false}});
await assert.rejects(registerSchoolTransaction({actor,input,firestore:revoked}),/permission revoked/);
await assert.rejects(registerSchoolTransaction({actor:{uid:"user",verifiedSuperAdmin:false},input,firestore}),/super admin/);
console.log("V47 transactional onboarding mock tests passed");
