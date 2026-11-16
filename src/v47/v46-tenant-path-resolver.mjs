/**
 * Explicitly bind legacy V46 collection names to one verified V47 school.
 * No Firebase SDK or database side effects. Caller must verify membership,
 * and deployed Firestore rules must independently enforce tenant permissions.
 */
import {assertSchoolId,schoolCollectionPath} from "./tenant-domain.mjs";
import {V46_COLLECTION_POLICY} from "./v46-collection-map.mjs";
export function createV46TenantPathResolver({verifiedSchoolId,verifiedMembership}) {
 const id=assertSchoolId(verifiedSchoolId);
 if(!verifiedMembership || verifiedMembership.schoolId!==id ||
    verifiedMembership.active!==true || !Array.isArray(verifiedMembership.roles) ||
    verifiedMembership.roles.length===0 ||
    new Set(verifiedMembership.roles).size!==verifiedMembership.roles.length ||
    verifiedMembership.roles.some(role=>!["school_admin","class_teacher","subject_teacher","viewer"].includes(role)) ||
    (verifiedMembership.roles.includes("viewer")&&verifiedMembership.roles.length!==1))
  throw new Error("Verified school membership required");
 const resolveCollection=name=>{
  if(typeof name!=="string" || !Object.hasOwn(V46_COLLECTION_POLICY,name))
   throw new TypeError("Unreviewed legacy collection");
  const category=V46_COLLECTION_POLICY[name];
  if(category==="tenant-server-managed" || category==="tenant-public-publishing")
   throw new Error("Legacy collection requires server-side migration review");
  return schoolCollectionPath(id,name);
 };
 return Object.freeze({schoolId:id,collection:resolveCollection});
}
