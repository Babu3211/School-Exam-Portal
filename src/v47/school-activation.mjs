/**
 * Trusted V47 school activation: school stays pending until a verified platform
 * admin explicitly activates it after membership and billing review.
 * No automatic activation, no browser writes, no V46 production changes.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
import {verifyPlatformAdminRequest} from "./verified-platform-admin.mjs";
export async function activateSchoolFromVerifiedToken({idToken,schoolId,auth,firestore,now=new Date()}) {
 assertSchoolId(schoolId);
 const actor=await verifyPlatformAdminRequest({idToken,auth,firestore});
 if(typeof firestore?.runTransaction!=="function")throw new TypeError("Admin Firestore transaction required");
 const schoolRef=firestore.doc("schools/"+schoolId);
 const adminRef=firestore.doc("platform_admins/"+actor.uid);
 const auditRef=firestore.collection("v47_registration_audit").doc();
 const activatedAt=now.toISOString();
 await firestore.runTransaction(async tx=>{
  const [admin,school]=await Promise.all([tx.get(adminRef),tx.get(schoolRef)]);
  if(!admin.exists || admin.data()?.active!==true)throw new Error("Platform admin permission revoked");
  if(!school.exists)throw new Error("School not found");
  const data=school.data();
  if(data?.status!=="pending")throw new Error("School must be pending");
  if(typeof data.adminEmail!=="string" || !data.adminEmail.trim())throw new Error("School admin email required");
  if(data.subscriptionStatus!=="free" && data.subscriptionStatus!=="paid")
   throw new Error("School subscription not approved");
  // Activation is only possible after the registered school admin is a real member.
  const index=await tx.get(firestore.doc("v47_school_admin_index/"+schoolId));
  const adminUid=index.exists?index.data()?.adminUid:null;
  if(typeof adminUid!=="string" || !adminUid)throw new Error("School admin invitation required");
  const member=await tx.get(firestore.doc("schools/"+schoolId+"/members/"+adminUid));
  if(!member.exists || member.data()?.active!==true || !member.data()?.roles?.includes("school_admin"))
   throw new Error("Active school admin required");
  tx.update(schoolRef,{status:"active",activatedAt,activatedBy:actor.uid});
  tx.create(auditRef,{action:"school_activated",schoolId,actorUid:actor.uid,activatedAt});
 });
 return Object.freeze({schoolId,status:"active"});
}
