/**
 * V47 trusted school-admin invitation (not a deployed endpoint).
 * Called only from server after verifying the platform admin ID token.
 * Auth account provisioning is intentionally separate: no password storage,
 * no client-side privileged role assignment.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
export async function inviteSchoolAdmin({actor,schoolId,adminEmail,firestore,auth,now=new Date()}) {
 assertSchoolId(schoolId);
 if(!actor || !actor.uid || actor.verifiedSuperAdmin!==true) throw new Error("Verified super admin required");
 if(typeof adminEmail!=="string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) throw new TypeError("Valid email required");
 if(!firestore || typeof firestore.runTransaction!=="function" || !auth || typeof auth.getUserByEmail!=="function") throw new TypeError("Trusted Firebase Admin SDK required");
 const email=adminEmail.trim().toLowerCase();
 // Existing Auth account only: avoids orphan account on failed Firestore transaction.
 const user=await auth.getUserByEmail(email);
 if(!user?.uid || user.disabled) throw new Error("Active Auth user required");
 const schoolRef=firestore.doc(`schools/${schoolId}`);
 const adminRef=firestore.doc(`platform_admins/${actor.uid}`);
 const memberRef=firestore.doc(`schools/${schoolId}/members/${user.uid}`);
 const auditRef=firestore.collection("v47_registration_audit").doc();
 await firestore.runTransaction(async tx=>{
  const [adminSnap,schoolSnap,memberSnap]=await Promise.all([tx.get(adminRef),tx.get(schoolRef),tx.get(memberRef)]);
  if(!adminSnap.exists || adminSnap.data()?.active!==true) throw new Error("Super admin permission revoked");
  if(!schoolSnap.exists) throw new Error("School not found");
  if(schoolSnap.data()?.adminEmail!==email) throw new Error("Admin email does not match school registration");
  if(memberSnap.exists) throw new Error("Membership already exists; explicit review required");
  tx.create(memberRef,{uid:user.uid,schoolId,roles:["school_admin"],active:true,createdBy:actor.uid,createdAt:now.toISOString()});
  tx.create(auditRef,{action:"school_admin_invited",schoolId,actorUid:actor.uid,targetUid:user.uid,createdAt:now.toISOString()});
 });
 return Object.freeze({schoolId,adminUid:user.uid,status:"member_created"});
}
