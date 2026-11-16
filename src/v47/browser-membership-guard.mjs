import {assertSchoolId} from "./tenant-domain.mjs";
const ROLES=new Set(["school_admin","class_teacher","subject_teacher","viewer"]);
export function verifyV47BrowserMembership({schoolId,uid,school,member}) {
 const id=assertSchoolId(schoolId);
 if(typeof uid!=="string" || !uid.trim() ||
    !school || school.schoolId!==id || school.status!=="active" ||
    !member || member.schoolId!==id || member.uid!==uid || member.active!==true ||
    !Array.isArray(member.roles) || member.roles.length===0 ||
    new Set(member.roles).size!==member.roles.length ||
    member.roles.some(role=>!ROLES.has(role)) ||
    (member.roles.includes("viewer") && member.roles.length!==1))
  throw new Error("School access not verified");
 return Object.freeze({schoolId:id,uid,roles:Object.freeze([...member.roles]),readOnly:member.roles.includes("viewer")});
}
