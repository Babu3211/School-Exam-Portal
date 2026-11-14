/**
 * Explicit V47-only mount. Host supplies Firebase Auth and its subscription.
 * Auth changes immediately clear tenant data and invalidate pending responses.
 */
import {createV47FirebaseTokenProvider} from "./firebase-workspace-auth.mjs";
import {mountV47SchoolWorkspace} from "./school-workspace-view.mjs";
export function mountV47FirebaseWorkspace({root,document,auth,fetchImpl,subscribeAuthState}) {
 if(typeof subscribeAuthState!=="function")
  throw new TypeError("Firebase auth-state subscription required");
 const view=mountV47SchoolWorkspace({
  root,document,fetchImpl,
  getIdToken:createV47FirebaseTokenProvider({auth})
 });
 let initial=true;
 let lastUser=auth.currentUser?.uid ?? null;
 let unsubscribe;
 try {
  unsubscribe=subscribeAuthState(auth,user=>{
   const uid=user?.uid ?? null;
   if(initial){initial=false;if(uid===lastUser)return;}
   if(uid!==lastUser){lastUser=uid;view.clearSession();}
  });
  if(typeof unsubscribe!=="function")throw new TypeError("Unsubscribe function required");
 }catch(error){view.dispose();throw error;}
 return Object.freeze({dispose(){unsubscribe();view.dispose();}});
}
