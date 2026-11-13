/**
 * V47 tenant dashboard view model. Pure: does not read V46 root collections.
 * Memberships MUST be fetched by trusted server from verified auth UID.
 * This model is not an authorization boundary; Firestore rules enforce access.
 */
import {availableSchoolsForUser,resolveSchoolSession} from "./school-session.mjs";
export function buildSchoolDashboard({authUid,selectedSchoolId,memberships,schools}) {
 if(!Array.isArray(schools)) throw new TypeError("Server school records required");
 const accessible=availableSchoolsForUser(authUid,memberships);
 const selected=resolveSchoolSession({authUid,schoolId:selectedSchoolId,serverMemberships:memberships});
 const school=schools.find(s=>s && s.schoolId===selectedSchoolId);
 if(!school) throw new Error("Selected school not found");
 const options=accessible.map(m=>{
  const record=schools.find(s=>s && s.schoolId===m.schoolId);
  return Object.freeze({schoolId:m.schoolId,name:record?.name||m.schoolId,roles:m.roles});
 });
 return Object.freeze({
  schoolId:selected.schoolId,
  schoolName:school.name,
  roles:selected.roles,
  readOnly:selected.roles.includes("viewer"),
  availableSchools:Object.freeze(options),
  // No student data, marks or school billing data included in selector.
 });
}
