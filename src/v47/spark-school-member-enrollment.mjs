/**
 * Firebase Spark browser SDK: add a limited member to an active school.
 * Security rules authorize only the school's admin; no account is created.
 * The target UID must already exist in Firebase Auth.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
const allowed=new Set(["viewer","subject_teacher","class_teacher"]);
export async function enrollSparkSchoolMember({auth,firestore,doc,setDoc,projectId,schoolId,uid,role}) {
 if(projectId!=="smss-exam-portal-v47")throw new Error("V47 staging project required");
 if(!auth?.currentUser?.uid || auth.currentUser.isAnonymous)throw new Error("Authentication required");
 assertSchoolId(schoolId);
 if(typeof uid!=="string" || !uid.trim() || uid.includes("/") || uid===auth.currentUser.uid)throw new TypeError("Invalid target member UID");
 if(!allowed.has(role))throw new TypeError("Only teacher or viewer roles can be enrolled");
 if(typeof doc!=="function" || typeof setDoc!=="function")throw new TypeError("Firestore Web SDK adapters required");
 const membership=Object.freeze({uid,schoolId,roles:[role],active:true});
 await setDoc(doc(firestore,"schools",schoolId,"members",uid),membership);
 return Object.freeze({schoolId,uid,role});
}
