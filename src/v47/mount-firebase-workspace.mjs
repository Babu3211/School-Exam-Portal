/**
 * Explicit V47-only mount. Host application supplies its existing Auth instance.
 * No automatic login, Firebase initialization, or production page modification.
 */
import {createV47FirebaseTokenProvider} from "./firebase-workspace-auth.mjs";
import {mountV47SchoolWorkspace} from "./school-workspace-view.mjs";
export function mountV47FirebaseWorkspace({root,document,auth,fetchImpl}) {
 return mountV47SchoolWorkspace({
  root,document,fetchImpl,
  getIdToken:createV47FirebaseTokenProvider({auth})
 });
}
