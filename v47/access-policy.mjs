// UI-only authorization hints. Firestore rules are authoritative.
export const ROLES=Object.freeze(['school_admin','teacher','viewer']);
export function effectiveSchoolRole({schoolId,membership,schoolActive}) {
  if(typeof schoolId!=='string'||!schoolActive||!membership||membership.active!==true||
     membership.schoolId!==schoolId||!ROLES.includes(membership.role)) return null;
  return membership.role;
}
export function mayPerform({schoolId,membership,schoolActive,action}) {
  const role=effectiveSchoolRole({schoolId,membership,schoolActive});
  if(!role) return false;
  if(action==='read') return true;
  if(action==='write' || action==='manage') return role==='school_admin';
  return false;
}
