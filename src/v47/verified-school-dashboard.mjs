/**
 * Server-only selected-school dashboard. Does not enumerate all schools.
 * The verified Firebase UID, not a client-provided UID, determines membership.
 */
import {loadVerifiedSchoolSession} from "./verified-school-session.mjs";
export async function loadVerifiedSchoolDashboard({idToken,schoolId,auth,firestore}) {
 const session=await loadVerifiedSchoolSession({idToken,schoolId,auth,firestore});
 const schoolSnapshot=await firestore.doc(`schools/${session.schoolId}`).get();
 if(!schoolSnapshot.exists || schoolSnapshot.data()?.status!=="active")
  throw new Error("School is not active");
 const school=schoolSnapshot.data();
 return Object.freeze({
  schoolId:session.schoolId,
  schoolName:typeof school.name==="string" && school.name.trim()?school.name:session.schoolId,
  roles:Object.freeze([...session.roles]),
  readOnly:session.roles.includes("viewer"),
  // Deliberately omit billing, members, marks and student records.
 });
}
