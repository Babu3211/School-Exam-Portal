/**
 * Trusted-server-only teacher assignment transaction.
 * Requires a verified school admin session and a pre-existing active teacher
 * membership. Browser-supplied roles are never accepted as authority.
 * This module does not touch V46 or deploy any rules.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
import {assignmentRecord,assignmentKey} from "../../v47/teacher-assignment.mjs";
const CLASS=/^(ECD|LKG|UKG|(?:[1-9]|1[0-2]))$/;
const SUBJECT=/^[A-Za-z0-9_-]{1,64}$/;
const UID=/^[A-Za-z0-9_-]{1,128}$/;
const TERMS=new Set(["first","second","weekly","monthly","1st","2nd","3rd","final"]);
export function prepareTeacherAssignment({schoolId,teacherUid,classId,subjectId,kind,terms}) {
 assertSchoolId(schoolId);
 if(typeof teacherUid!=="string" || typeof classId!=="string" ||
    (kind==="subject_teacher" && typeof subjectId!=="string") ||
    !UID.test(teacherUid) || !CLASS.test(classId) ||
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
 const canonical=/^[0-9]{5,20}$/.test(assignment.schoolId);
 // The actual V47 browser and Firestore rules use teacher_assignments with
 // schoolId:uid:classId:subjectId IDs and inactive-by-default creation.
 // Preserve the old prototype collection ONLY for non-IEMIS prototype IDs.
 const subjectId=assignment.kind==="class_teacher"?"attendance":assignment.subjectId;
 const record=canonical?assignmentRecord({...assignment,subjectId}):assignment;
 const id=canonical?assignmentKey(record):assignment.id;
 const adminRef=firestore.doc(`schools/${assignment.schoolId}/members/${adminSession.uid}`);
 const memberRef=firestore.doc(`schools/${assignment.schoolId}/members/${assignment.uid}`);
 const schoolRef=firestore.doc(`schools/${assignment.schoolId}`);
 const assignmentRef=firestore.doc(`schools/${assignment.schoolId}/${canonical?"teacher_assignments":"assignments"}/${id}`);
 const subjectRef=canonical&&subjectId!=="attendance"
   ?firestore.doc(`schools/${assignment.schoolId}/subjects/${subjectId}`):null;
 await firestore.runTransaction(async tx=>{
   if(canonical){
     const schoolSnapshot=await tx.get(schoolRef);
     const school=schoolSnapshot.exists?schoolSnapshot.data():null;
     if(!school || school.active!==true || school.id!==assignment.schoolId)
      throw new Error("Active canonical school required for teacher assignment");
   }
   const adminMembership=await tx.get(adminRef);
   const adminRecord=adminMembership.exists?adminMembership.data():null;
   const canonicalAdmin=adminRecord && !Object.hasOwn(adminRecord,"roles") &&
      adminRecord.role==="school_admin";
   const legacyAdmin=adminRecord && !Object.hasOwn(adminRecord,"role") &&
      Array.isArray(adminRecord.roles) &&
      adminRecord.roles.includes("school_admin") &&
      !adminRecord.roles.includes("viewer");
   if(!adminRecord || (Object.hasOwn(adminRecord,"uid") && adminRecord.uid!==adminSession.uid) ||
      (Object.hasOwn(adminRecord,"schoolId") && adminRecord.schoolId!==assignment.schoolId) ||
      adminRecord.active!==true || !(canonicalAdmin||legacyAdmin))
     throw new Error("Active school admin membership required");
   const membership=await tx.get(memberRef);
   const member=membership.exists?membership.data():null;
   // Canonical V47 has a single "teacher" role, with subject-specific
   // permission enforced by the assignment record; never trust client roles.
   const canonicalTeacher=member && !Object.hasOwn(member,"roles") &&
      member.role==="teacher";
   const legacyTeacher=member && !Object.hasOwn(member,"role") &&
      Array.isArray(member.roles) && member.roles.includes(assignment.kind) &&
      !member.roles.includes("viewer");
   if(!member || (Object.hasOwn(member,"uid") && member.uid!==assignment.uid) ||
      (Object.hasOwn(member,"schoolId") && member.schoolId!==assignment.schoolId) ||
      member.active!==true || !(canonicalTeacher||legacyTeacher))
     throw new Error("Active teacher membership with matching role required");
   if(canonical && !(canonicalAdmin&&canonicalTeacher))
     throw new Error("Canonical IEMIS membership required for teacher assignment");
   if(canonical && subjectRef){
     const subjectSnap=await tx.get(subjectRef);
     const subject=subjectSnap.exists?subjectSnap.data():null;
     if(!subject || subject.schoolId!==assignment.schoolId ||
        subject.class!==assignment.classId || subject.active!==true)
      throw new Error("Active scoped subject required for teacher assignment");
   }
   if(canonical){
     const existing=await tx.get(assignmentRef);
     if(existing.exists)throw new Error("Teacher assignment already exists");
   }
   // A new canonical assignment is NOT active until the School Admin
   // explicitly enables it; this mirrors V47 Firestore create rules.
   tx.set(assignmentRef,record);
 });
 return Object.freeze({...record,id});
}
