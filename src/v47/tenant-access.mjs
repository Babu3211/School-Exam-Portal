/**
 * V47 tenant authorization policy prototype (pure, no Firebase side effects).
 * UI checks are NOT a security boundary. Mirror approved rules in Firestore
 * security rules and trusted server operations before connecting live data.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
const ROLES=new Set(["school_admin","class_teacher","subject_teacher","viewer"]);
export function normalizeMembership({uid,schoolId,roles,active=true}) {
  if(typeof uid!=="string" || !uid.trim()) throw new TypeError("UID required");
  assertSchoolId(schoolId);
  if(!Array.isArray(roles) || !roles.length || roles.some(r=>!ROLES.has(r))) throw new TypeError("Invalid school roles");
  if(typeof active!=="boolean") throw new TypeError("Invalid active flag");
  return Object.freeze({uid,schoolId,roles:Object.freeze([...new Set(roles)]),active});
}
export function mayAccessSchool(membership,schoolId,operation) {
  assertSchoolId(schoolId);
  if(!membership || !membership.active || membership.schoolId!==schoolId) return false;
  if(operation==="read") return true;
  if(operation!=="write") return false;
  if(membership.roles.includes("viewer")) return false; // viewer always read-only, even with another role
  return membership.roles.includes("school_admin") ||
    membership.roles.includes("class_teacher") ||
    membership.roles.includes("subject_teacher");
}
export function mayManageSchool(membership,schoolId) {
  return mayAccessSchool(membership,schoolId,"write") &&
    membership.roles.includes("school_admin");
}
