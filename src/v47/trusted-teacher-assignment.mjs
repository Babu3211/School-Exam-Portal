/**
 * Trusted-server-only teacher assignment transaction.
 * Requires a verified school admin session and a pre-existing active teacher
 * membership. Browser-supplied roles are never accepted as authority.
 * This module does not touch V46 or deploy any rules.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
const CLASS=/^(ECD|(?:[1-9]|1[0-2]))$/;
const SUBJECT=/^[A-Za-z0-9_-]{1,64}$/;
const UID=/^[A-Za-z0-9_-]{1,128}$/;
const TERMS=new Set(["first","second","final"]);
export function prepareTeacherAssignment({schoolId,teacherUid,classId,subjectId,kind,terms}) {
 assertSchoolId(schoolId);
 if(!UID.test(teacherUid) || !CLASS.test(classId) ||
    !["subject_teacher","class_teacher"].includes(kind) ||
    (kind==="subject_teacher"&&!SUBJECT.test(subjectId)) ||
    !Array.isArray(terms) || !terms.length || terms.some(t=>!TERMS.has(t)))
   throw new TypeError("Invalid teacher assignment");
 const id=kind==="class_teacher"?`${teacherUid}_${classId}`:`${teacherUid}_${classId}_${subjectId}`;
 return Object.freeze({id,uid:teacherUid,schoolId,classId,kind,
   ...(kind==="subject_teacher"?{subjectId}:{}),terms:[...new Set(terms)],active:true});
}
export async function assignTeacherOnTrustedServer({adminSession,input,firestore}) {
 if(!adminSession || typeof adminSession.uid!=="string" || !UID.test(adminSession.uid) || adminSession.schoolId!==input?.schoolId ||
    !Array.isArray(adminSession.roles) || !adminSession.roles.includes("school_admin") ||
    adminSession.roles.includes("viewer"))
   throw new Error("Verified school admin session required");
 if(!firestore || typeof firestore.runTransaction!=="function" || typeof firestore.doc!=="function")
   throw new TypeError("Admin Firestore required");
 const assignment=prepareTeacherAssignment(input);
 const adminRef=firestore.doc(`schools/${assignment.schoolId}/members/${adminSession.uid}`);
 const memberRef=firestore.doc(`schools/${assignment.schoolId}/members/${assignment.uid}`);
 const assignmentRef=firestore.doc(`schools/${assignment.schoolId}/assignments/${assignment.id}`);
 await firestore.runTransaction(async tx=>{
   const adminMembership=await tx.get(adminRef);
   const adminRecord=adminMembership.exists?adminMembership.data():null;
   if(!adminRecord || adminRecord.active!==true || !Array.isArray(adminRecord.roles) ||
      !adminRecord.roles.includes("school_admin") || adminRecord.roles.includes("viewer"))
     throw new Error("Active school admin membership required");
   const membership=await tx.get(memberRef);
   const member=membership.exists?membership.data():null;
   if(!member || member.active!==true || !Array.isArray(member.roles) ||
      !member.roles.includes(assignment.kind) || member.roles.includes("viewer"))
     throw new Error("Active teacher membership with matching role required");
   tx.set(assignmentRef,assignment);
 });
 return assignment;
}
