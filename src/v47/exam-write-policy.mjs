/**
 * V47 marks/attendance write authorization model. Pure and deny-by-default.
 * The caller MUST provide server-loaded, immutable assignments and membership.
 * Firestore rules must independently enforce the same constraints.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
const CLASS=/^(ECD|(?:[1-9]|1[0-2]))$/;
const SUBJECT=/^[A-Za-z0-9_-]{1,64}$/;
const TERMS=new Set(["first","second","final"]);
export function mayWriteExamRecord({membership,assignment,schoolId,classId,subjectId,term,resource}) {
 try {
  assertSchoolId(schoolId);
  if(!["marks","attendance"].includes(resource) || !CLASS.test(classId) ||
     !TERMS.has(term) || (resource==="marks"&&!SUBJECT.test(subjectId))) return false;
  if(!membership || membership.schoolId!==schoolId || membership.active!==true ||
     !Array.isArray(membership.roles) || membership.roles.includes("viewer")) return false;
  if(membership.roles.includes("school_admin")) return true;
  if(!assignment || assignment.active!==true || assignment.schoolId!==schoolId ||
     assignment.uid!==membership.uid || assignment.classId!==classId ||
     !Array.isArray(assignment.terms) || !assignment.terms.includes(term)) return false;
  if(resource==="attendance") return membership.roles.includes("class_teacher") &&
     assignment.kind==="class_teacher";
  return (membership.roles.includes("subject_teacher") && assignment.kind==="subject_teacher" &&
      assignment.subjectId===subjectId) ||
     (membership.roles.includes("class_teacher") && assignment.kind==="class_teacher" &&
      Array.isArray(assignment.subjectIds) && assignment.subjectIds.includes(subjectId));
 } catch {return false;}
}
