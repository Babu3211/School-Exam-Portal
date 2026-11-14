/**
 * Server-only school chooser: read memberships from a trusted UID index,
 * never from a client-provided UID, and verify each school is active.
 * The index is trusted only after onboarding has maintained it transactionally.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
import {availableSchoolsForUser} from "./school-session.mjs";
import {resolveSchoolSession} from "./school-session.mjs";
export async function listVerifiedUserSchools({idToken,auth,firestore}) {
 if(typeof idToken!=="string" || !idToken)throw new Error("Authentication required");
 if(typeof auth?.verifyIdToken!=="function" || typeof firestore?.doc!=="function")
  throw new TypeError("Firebase Admin SDK required");
 const decoded=await auth.verifyIdToken(idToken,true);
 if(typeof decoded?.uid!=="string" || !decoded.uid || decoded.firebase?.sign_in_provider==="anonymous")
  throw new Error("Authentication required");
 const uid=decoded.uid;
 const index=await firestore.doc("v47_user_school_index/"+uid).get();
 const entries=index.exists?index.data()?.memberships:[];
 if(!Array.isArray(entries) || entries.length>100)
  throw new Error("Invalid school membership index");
 const memberships=availableSchoolsForUser(uid,entries);
 const schools=[];
 for(const membership of memberships) {
  // A stale or malformed index entry must not block the user’s other schools.
  try {assertSchoolId(membership.schoolId);} catch {continue;}
  const school=await firestore.doc("schools/"+membership.schoolId).get();
  if(!school.exists || school.data()?.status!=="active")continue;
  const actual=await firestore.doc("schools/"+membership.schoolId+"/members/"+uid).get();
  if(!actual.exists || actual.data()?.active!==true)continue;
  const member=actual.data();
  if((Object.hasOwn(member,"uid") && member.uid!==uid) ||
     (Object.hasOwn(member,"schoolId") && member.schoolId!==membership.schoolId))continue;
  let verified;
  try {verified=resolveSchoolSession({authUid:uid,schoolId:membership.schoolId,serverMemberships:[{...actual.data(),uid,schoolId:membership.schoolId}]});}
  catch {continue;}
  schools.push(Object.freeze({
   schoolId:membership.schoolId,
   schoolName:String(school.data()?.name||membership.schoolId),
   roles:Object.freeze([...verified.roles])
  }));
 }
 return Object.freeze(schools);
}
