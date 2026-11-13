/**
 * V47 school login session resolver (pure, no Firebase / no V46 changes).
 * Trusted server must fetch memberships using verified auth UID; browser
 * cannot submit or edit the membership list used here.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
import {normalizeMembership} from "./tenant-access.mjs";
export function availableSchoolsForUser(authUid, serverMemberships) {
 if(typeof authUid!=="string" || !authUid) throw new TypeError("Verified auth UID required");
 if(!Array.isArray(serverMemberships)) throw new TypeError("Server memberships required");
 const seen=new Set();
 return Object.freeze(serverMemberships.filter(item=>item && item.uid===authUid && item.active===true)
  .map(item=>normalizeMembership(item))
  .filter(item=>{if(seen.has(item.schoolId))return false;seen.add(item.schoolId);return true;}));
}
export function resolveSchoolSession({authUid,schoolId,serverMemberships}) {
 assertSchoolId(schoolId);
 const memberships=availableSchoolsForUser(authUid,serverMemberships);
 const membership=memberships.find(item=>item.schoolId===schoolId);
 if(!membership) throw new Error("No active membership for selected school");
 return Object.freeze({uid:authUid,schoolId,roles:membership.roles});
}
