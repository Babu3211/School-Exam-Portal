/**
 * V47 trusted server onboarding adapter factory.
 * Accepts Firebase Admin Firestore instance ONLY, never browser SDK.
 * Call only after verifying Firebase ID token on server and resolving
 * actor.verifiedSuperAdmin against server-owned platform_admins.
 * Does not create Firebase Auth accounts or deploy rules.
 */
import {createRegistrationCommand} from "./school-registration.mjs";
export async function registerSchoolTransaction({actor,input,firestore,now=new Date()}) {
 const command=createRegistrationCommand(actor,input);
 if(!firestore || typeof firestore.runTransaction!=="function") throw new TypeError("Admin Firestore required");
 const {school,adminEmail,actorUid}=command;
 const schoolRef=firestore.doc(`schools/${school.schoolId}`);
 const iemisRef=firestore.doc(`v47_iemis_index/${school.iemisCode.toUpperCase()}`);
 const auditRef=firestore.collection("v47_registration_audit").doc();
 const createdAt=now.toISOString();
 await firestore.runTransaction(async tx=>{
  // Re-verify the platform-admin record inside the same transaction.
  const adminRef=firestore.doc(`platform_admins/${actorUid}`);
  const [adminSnap,schoolSnap,iemisSnap]=await Promise.all([
   tx.get(adminRef),tx.get(schoolRef),tx.get(iemisRef)
  ]);
  if(!adminSnap.exists || adminSnap.data()?.active!==true) throw new Error("Platform admin permission revoked");
  if(schoolSnap.exists) throw new Error("School ID already registered");
  if(iemisSnap.exists) throw new Error("IEMIS code already registered");
  tx.create(schoolRef,{...school,adminEmail,createdAt,createdBy:actorUid});
  tx.create(iemisRef,{schoolId:school.schoolId,createdAt});
  tx.create(auditRef,{action:"school_registered",schoolId:school.schoolId,actorUid,createdAt});
 });
 return Object.freeze({schoolId:school.schoolId,status:school.status});
}
