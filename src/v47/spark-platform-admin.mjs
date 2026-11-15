/**
 * Spark-compatible platform-admin identity check using the Firebase Web SDK.
 * Never trust a caller-supplied UID, role, or school ID.
 * The existing deny-all rules intentionally prevent this read until a reviewed
 * rules change is deployed. This module does not grant any write capability.
 */
export async function checkSparkPlatformAdmin({auth,firestore,doc,getDoc}) {
 if(typeof doc!=="function" || typeof getDoc!=="function")throw new TypeError("Firestore Web SDK adapters required");
 const user=auth?.currentUser;
 if(!user || typeof user.uid!=="string" || !user.uid || user.isAnonymous===true)
  return Object.freeze({signedIn:false,isPlatformAdmin:false});
 const uid=user.uid;
 const snap=await getDoc(doc(firestore,"platform_admins",uid));
 return Object.freeze({signedIn:true,isPlatformAdmin:snap.exists() && snap.data()?.active===true});
}
