/**
 * Server-only school membership lookup for authenticated Firebase users.
 * Never accept UID from client JSON: derive it from verified ID token.
 * This intentionally uses a per-user index that only trusted Admin SDK writes.
 * Index creation and migration must be transactionally enforced before use.
 */
import {resolveSchoolSession} from "./school-session.mjs";
import {assertSchoolId} from "./tenant-domain.mjs";
export async function loadVerifiedSchoolSession({idToken,schoolId,auth,firestore}) {
 if(typeof idToken!=="string" || !idToken) throw new Error("Firebase ID token required");
 if(!auth || typeof auth.verifyIdToken!=="function" || !firestore || typeof firestore.doc!=="function")
   throw new TypeError("Firebase Admin SDK required");
 assertSchoolId(schoolId);
 const decoded=await auth.verifyIdToken(idToken,true);
 if(!decoded?.uid || decoded.firebase?.sign_in_provider==="anonymous") throw new Error("Authenticated account required");
 const uid=decoded.uid;
 // Direct school membership lookup avoids cross-tenant collection queries.
 const schoolSnapshot=await firestore.doc(`schools/${schoolId}`).get();
 if(!schoolSnapshot.exists || schoolSnapshot.data()?.status!=="active")
   throw new Error("School is not active");
 const snapshot=await firestore.doc(`schools/${schoolId}/members/${uid}`).get();
 const data=snapshot.exists?snapshot.data():null;
 if(data && ((Object.hasOwn(data,"uid") && data.uid!==uid) ||
  (Object.hasOwn(data,"schoolId") && data.schoolId!==schoolId)))
  throw new Error("School membership identity mismatch");
 const memberships=data?[{...data,uid,schoolId}]:[];
 return resolveSchoolSession({authUid:uid,schoolId,serverMemberships:memberships});
}
