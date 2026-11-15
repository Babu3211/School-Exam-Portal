/**
 * V47 Spark-only teacher assignment. Firestore rules verify the school's
 * admin and the target teacher's existing active school membership.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
const validTerms=new Set(["first","second","final"]);
const validKinds=new Set(["class_teacher","subject_teacher"]);
export async function createSparkTeacherAssignment({auth,firestore,doc,setDoc,projectId,schoolId,uid,classId,kind,terms,subjectId}) {
 if(projectId!=="smss-exam-portal-v47")throw new Error("V47 staging project required");
 if(!auth?.currentUser?.uid || auth.currentUser.isAnonymous)throw new Error("Authentication required");
 assertSchoolId(schoolId);
 if(typeof uid!=="string" || !uid.trim() || uid.trim()!==uid || uid.includes("/") || uid.length>128)throw new TypeError("Invalid teacher UID");
 if(typeof classId!=="string" || !/^(ECD|[1-9]|1[0-2])$/.test(classId))throw new TypeError("Invalid class");
 if(!validKinds.has(kind))throw new TypeError("Invalid teacher kind");
 if(!Array.isArray(terms) || terms.length<1 || terms.length>3 || new Set(terms).size!==terms.length || !terms.every(t=>validTerms.has(t)))throw new TypeError("Invalid terms");
 if(kind==="subject_teacher" && (typeof subjectId!=="string" || !/^[A-Za-z0-9_-]{1,64}$/.test(subjectId)))throw new TypeError("Invalid subject ID");
 if(kind==="class_teacher" && subjectId)throw new TypeError("Class teacher must not specify subject");
 const assignmentId=kind==="subject_teacher"?uid+"_"+classId+"_"+subjectId:uid+"_"+classId;
 if(assignmentId.length>256)throw new TypeError("Invalid assignment ID");
 if(typeof doc!=="function" || typeof setDoc!=="function")throw new TypeError("Firestore Web SDK adapters required");
 const data=Object.freeze({uid,schoolId,classId,kind,active:true,terms:[...terms],...(kind==="subject_teacher"?{subjectId}:{})});
 await setDoc(doc(firestore,"schools",schoolId,"assignments",assignmentId),data);
 return Object.freeze({schoolId,assignmentId,uid,classId,kind});
}
