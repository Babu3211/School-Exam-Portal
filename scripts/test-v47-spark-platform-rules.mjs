import assert from "node:assert/strict";
import {initializeTestEnvironment} from "@firebase/rules-unit-testing";
import {readFileSync} from "node:fs";
const host=process.env.FIRESTORE_EMULATOR_HOST;
if(!host)throw new Error("FIRESTORE_EMULATOR_HOST required: run inside Firebase emulator");
const [emulatorHost,port]=host.split(":");
const env=await initializeTestEnvironment({
 projectId:"v47-spark-platform-rules-test",
 firestore:{host:emulatorHost,port:Number(port),rules:readFileSync(new URL("../firestore.v47.prototype.rules",import.meta.url),"utf8")}
});
const {assertFails,assertSucceeds}=await import("@firebase/rules-unit-testing");
try{
 await env.withSecurityRulesDisabled(async ctx=>{
  await ctx.firestore().doc("platform_admins/trusted").set({active:true});
  await ctx.firestore().doc("platform_admins/other").set({active:false});
 });
 const trusted=env.authenticatedContext("trusted").firestore();
 const other=env.authenticatedContext("other").firestore();
 const guest=env.unauthenticatedContext().firestore();
 const school={schoolId:"school_A001",name:"Test School",iemisCode:"123456",annualFeeNpr:0,status:"pending",subscriptionStatus:"free"};
 await assertSucceeds(trusted.doc("platform_admins/trusted").get());
 await assertFails(trusted.doc("platform_admins/other").get());
 await assertFails(other.doc("platform_admins/trusted").get());
 await assertFails(guest.doc("platform_admins/trusted").get());
 await assertFails(trusted.collection("platform_admins").get());
 await assertFails(trusted.doc("platform_admins/trusted").set({active:false}));
 await assertFails(other.doc("platform_admins/other").set({active:true}));
 await assertFails(trusted.doc("platform_admins/trusted").update({active:false}));
 await assertFails(trusted.doc("platform_admins/trusted").delete());
 await assertFails(other.doc("schools/school_B001").set({...school,schoolId:"school_B001"}));
 await assertFails(trusted.doc("schools/school_A001").set({...school,status:"active"}));
 await assertFails(trusted.doc("schools/school_A001").set({...school,annualFeeNpr:100}));
 const firstBatch=trusted.batch();
 firstBatch.set(trusted.doc("v47_iemis_index/123456"),{schoolId:"school_A001",iemisCode:"123456"});
 firstBatch.set(trusted.doc("schools/school_A001"),school);
 await assertSucceeds(firstBatch.commit());
 await assertFails(trusted.doc("v47_iemis_index/123456").update({schoolId:"school_C001"}));
 await assertFails(trusted.doc("v47_iemis_index/123456").delete());
 await assertFails(trusted.doc("schools/school_Z001").set({...school,schoolId:"school_Z001"}));
 const atomicSchool={...school,schoolId:"school_C001",iemisCode:"654321"};
 const atomicBatch=trusted.batch();
 atomicBatch.set(trusted.doc("v47_iemis_index/654321"),{schoolId:"school_C001",iemisCode:"654321"});
 atomicBatch.set(trusted.doc("schools/school_C001"),atomicSchool);
 atomicBatch.set(trusted.doc("schools/school_C001/members/trusted"),{uid:"trusted",schoolId:"school_C001",roles:["school_admin"],active:true});
 await assertSucceeds(atomicBatch.commit());
 const hostileBatch=other.batch();
 hostileBatch.set(other.doc("schools/school_D001"),{...school,schoolId:"school_D001"});
 hostileBatch.set(other.doc("schools/school_D001/members/other"),{uid:"other",schoolId:"school_D001",roles:["school_admin"],active:true});
 await assertFails(hostileBatch.commit());
 await assertFails(other.doc("schools/school_A001").update({status:"active"}));
 await assertFails(trusted.doc("schools/school_A001").update({status:"active",iemisCode:"999999"}));
 await assertSucceeds(trusted.doc("schools/school_A001").update({status:"active"}));
 await assertFails(trusted.doc("schools/school_A001").update({status:"pending"}));
 await assertFails(trusted.doc("schools/school_A001").update({annualFeeNpr:500}));
 await assertFails(trusted.doc("schools/school_A001").delete());
 await assertFails(other.doc("schools/school_A001/members/other").set({uid:"other",schoolId:"school_A001",roles:["school_admin"],active:true}));
 await assertFails(trusted.doc("schools/school_A001/members/other").set({uid:"other",schoolId:"school_A001",roles:["viewer","school_admin"],active:true}));
 await assertFails(trusted.doc("schools/school_A001/members/other").set({uid:"other",schoolId:"school_A001",roles:["school_admin"],active:true}));
 await assertFails(trusted.doc("schools/school_A001/members/trusted").set({uid:"trusted",schoolId:"school_A001",roles:["school_admin"],active:true}));
 await assertFails(other.doc("schools/school_A001/members/other").update({roles:["viewer"]}));
 assert.equal((await trusted.doc("platform_admins/trusted").get()).data().active,true);
 console.log("V47 Spark self-only platform admin rules emulator checks passed");
}finally{await env.cleanup();}
