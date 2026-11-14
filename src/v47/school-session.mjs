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
 const valid=[];
 for(const item of serverMemberships) {
  if(!item || item.uid!==authUid || item.active!==true)continue;
  // An invalid or stale index row cannot deny access to other valid schools.
  let membership;
  try {membership=normalizeMembership(item);} catch {continue;}
  if(seen.has(membership.schoolId))continue;
  seen.add(membership.schoolId);
  valid.push(membership);
 }
 return Object.freeze(valid);
}
export function resolveSchoolSession({authUid,schoolId,serverMemberships}) {
 assertSchoolId(schoolId);
 const memberships=availableSchoolsForUser(authUid,serverMemberships);
 const membership=memberships.find(item=>item.schoolId===schoolId);
 if(!membership) throw new Error("No active membership for selected school");
 return Object.freeze({uid:authUid,schoolId,roles:membership.roles});
}
