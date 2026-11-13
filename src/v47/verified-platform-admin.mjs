/**
 * V47 trusted request identity. Run only in a backend with Firebase Admin SDK.
 * Never accept verifiedSuperAdmin, UID or roles from browser request JSON.
 * No network calls except through injected Admin SDK adapters.
 */
export async function verifyPlatformAdminRequest({idToken,auth,firestore}) {
 if(typeof idToken!=="string" || !idToken.trim()) throw new Error("Firebase ID token required");
 if(!auth || typeof auth.verifyIdToken!=="function") throw new TypeError("Admin Auth SDK required");
 if(!firestore || typeof firestore.doc!=="function") throw new TypeError("Admin Firestore required");
 const decoded=await auth.verifyIdToken(idToken,true);
 if(!decoded?.uid || decoded.firebase?.sign_in_provider==="anonymous") throw new Error("Verified signed-in user required");
 const record=await firestore.doc(`platform_admins/${decoded.uid}`).get();
 if(!record.exists || record.data()?.active!==true) throw new Error("Platform admin access denied");
 return Object.freeze({uid:decoded.uid,verifiedSuperAdmin:true});
}
