/**
 * Firebase Spark-only, browser SDK school bootstrap. No server credentials.
 * Requires a previously trusted platform_admins/{auth.uid} record and
 * emulator-tested Firestore rules. Never target V46 production.
 * Caller must pass Firestore Web SDK functions (doc, writeBatch).
 */
import {assertSchoolId} from "./tenant-domain.mjs";
export function prepareSparkSchoolBootstrap({schoolId,name,iemisCode,schoolAdminUid}) {
 assertSchoolId(schoolId);
 if(typeof name!=="string" || !name.trim() || name.trim().length>200)throw new TypeError("Invalid school name");
 if(typeof iemisCode!=="string" || !/^[A-Za-z0-9_-]{3,32}$/.test(iemisCode))throw new TypeError("Invalid IEMIS code");
 if(typeof schoolAdminUid!=="string" || !schoolAdminUid.trim() || schoolAdminUid.includes("/"))throw new TypeError("Invalid school admin UID");
 return Object.freeze({
  school:Object.freeze({schoolId,name:name.trim(),iemisCode,annualFeeNpr:0,status:"pending",subscriptionStatus:"free"}),
  membership:Object.freeze({uid:schoolAdminUid,schoolId,roles:["school_admin"],active:true})
 });
}
export async function bootstrapSparkSchool({auth,firestore,doc,writeBatch,projectId,input}) {
 if(projectId!=="smss-exam-portal-v47")throw new Error("V47 staging project required");
 if(!auth?.currentUser?.uid || auth.currentUser.isAnonymous)throw new Error("Authentication required");
 if(typeof input?.schoolAdminUid!=="string" || input.schoolAdminUid!==auth.currentUser.uid)throw new Error("Spark bootstrap only supports the authenticated platform admin as initial school admin");
 if(typeof doc!=="function" || typeof writeBatch!=="function")throw new TypeError("Firestore Web SDK adapters required");
 const {school,membership}=prepareSparkSchoolBootstrap(input);
 const batch=writeBatch(firestore);
 batch.set(doc(firestore,"schools",school.schoolId),school);
 batch.set(doc(firestore,"schools",school.schoolId,"members",membership.uid),membership);
 await batch.commit();
 return Object.freeze({schoolId:school.schoolId,status:"pending"});
}
