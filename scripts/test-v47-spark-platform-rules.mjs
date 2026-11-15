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
 await assertSucceeds(trusted.doc("platform_admins/trusted").get());
 await assertFails(trusted.doc("platform_admins/other").get());
 await assertFails(other.doc("platform_admins/trusted").get());
 await assertFails(guest.doc("platform_admins/trusted").get());
 await assertFails(trusted.collection("platform_admins").get());
 await assertFails(trusted.doc("platform_admins/trusted").set({active:false}));
 await assertFails(other.doc("platform_admins/other").set({active:true}));
 await assertFails(trusted.doc("platform_admins/trusted").update({active:false}));
 await assertFails(trusted.doc("platform_admins/trusted").delete());
 assert.equal((await trusted.doc("platform_admins/trusted").get()).data().active,true);
 console.log("V47 Spark self-only platform admin rules emulator checks passed");
}finally{await env.cleanup();}
