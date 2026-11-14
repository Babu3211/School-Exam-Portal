/**
 * V47-only Firebase Auth bridge for the isolated browser workspace.
 * Uses the currently signed-in Firebase user; never stores or logs tokens.
 * This module does not initialize Firebase or alter the V46 login.
 */
export function createV47FirebaseTokenProvider({auth}) {
 if(!auth || !("currentUser" in auth))throw new TypeError("Firebase Auth instance required");
 return async function getIdToken() {
  const user=auth.currentUser;
  if(!user || typeof user.getIdToken!=="function" || user.isAnonymous===true)
   throw new Error("Login required");
  const token=await user.getIdToken();
  // Do not reuse a token if sign-out or account switch happened during refresh.
  if(auth.currentUser!==user)throw new Error("Login session changed");
  if(typeof token!=="string" || !token.trim())throw new Error("Login required");
  return token;
 };
}
