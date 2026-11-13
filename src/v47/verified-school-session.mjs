/**
 * Server-only school membership lookup for authenticated Firebase users.
 * Never accept UID from client JSON: derive it from verified ID token.
 * This intentionally uses a per-user index that only trusted Admin SDK writes.
 * Index creation and migration must be transactionally enforced before use.
 */
import {availableSchoolsForUser,resolveSchoolSession} from "./school-session.mjs";
export async function loadVerifiedSchoolSession({idToken,schoolId,auth,firestore}) {
 if(typeof idToken!=="string" || !idToken) throw new Error("Firebase ID token required");
 if(!auth || typeof auth.verifyIdToken!=="function" || !firestore || typeof firestore.doc!=="function")
   throw new TypeError("Firebase Admin SDK required");
 const decoded=await auth.verifyIdToken(idToken,true);
 if(!decoded?.uid || decoded.firebase?.sign_in_provider==="anonymous") throw new Error("Authenticated account required");
 const uid=decoded.uid;
 // Direct school membership lookup avoids cross-tenant collection queries.
 const snapshot=await firestore.doc(`schools/${schoolId}/members/${uid}`).get();
 const data=snapshot.exists?snapshot.data():null;
 const memberships=data?[{...data,uid,schoolId}]:[];
 return resolveSchoolSession({authUid:uid,schoolId,serverMemberships:memberships});
}
