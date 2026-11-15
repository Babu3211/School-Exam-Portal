/** Toggle an existing teacher assignment without changing its identity or scope. */
import {assertSchoolId} from "./tenant-domain.mjs";
export async function setSparkTeacherAssignmentActive({auth,firestore,doc,updateDoc,projectId,schoolId,assignmentId,active}) {
 if(projectId!=="smss-exam-portal-v47")throw new Error("V47 staging project required");
 if(!auth?.currentUser?.uid || auth.currentUser.isAnonymous)throw new Error("Authentication required");
 assertSchoolId(schoolId);
 if(typeof assignmentId!=="string" || !/^[A-Za-z0-9_-]{3,256}$/.test(assignmentId))throw new TypeError("Invalid assignment ID");
 if(typeof active!=="boolean")throw new TypeError("Active must be boolean");
 if(typeof doc!=="function" || typeof updateDoc!=="function")throw new TypeError("Firestore Web SDK adapters required");
 await updateDoc(doc(firestore,"schools",schoolId,"assignments",assignmentId),{active});
 return Object.freeze({schoolId,assignmentId,active});
}
