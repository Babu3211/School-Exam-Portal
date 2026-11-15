/**
 * Firebase Spark browser-only school activation.
 * Firestore rules enforce platform-admin privilege and status-only transition.
 * Never connects to V46 or uses privileged server credentials.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
export async function activateSparkSchool({auth,firestore,doc,updateDoc,projectId,schoolId}) {
 if(projectId!=="smss-exam-portal-v47")throw new Error("V47 staging project required");
 if(!auth?.currentUser?.uid || auth.currentUser.isAnonymous)throw new Error("Authentication required");
 if(typeof doc!=="function" || typeof updateDoc!=="function")throw new TypeError("Firestore Web SDK adapters required");
 assertSchoolId(schoolId);
 await updateDoc(doc(firestore,"schools",schoolId),{status:"active"});
 return Object.freeze({schoolId,status:"active"});
}
