/** V47 Spark Web SDK limited school member activation/deactivation.
 * Firestore rules enforce school-admin authority and immutable roles.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
export async function setSparkSchoolMemberActive({auth,firestore,doc,updateDoc,projectId,schoolId,uid,active}) {
 if(projectId!=="smss-exam-portal-v47")throw new Error("V47 staging project required");
 if(!auth?.currentUser?.uid || auth.currentUser.isAnonymous)throw new Error("Authentication required");
 assertSchoolId(schoolId);
 if(typeof uid!=="string" || !uid.trim() || uid!==uid.trim() || uid.includes("/") || uid.length>128)throw new TypeError("Invalid member UID");
 if(uid===auth.currentUser.uid)throw new Error("Cannot change your own access");
 if(typeof active!=="boolean")throw new TypeError("Active must be boolean");
 if(typeof doc!=="function" || typeof updateDoc!=="function")throw new TypeError("Firestore Web SDK adapters required");
 await updateDoc(doc(firestore,"schools",schoolId,"members",uid),{active});
 return Object.freeze({schoolId,uid,active});
}
