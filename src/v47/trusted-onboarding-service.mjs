/**
 * V47 server-only onboarding use case. No HTTP endpoint or deployment.
 * The bearer token is verified on the server, never trust client actor fields.
 * School creation and admin membership are deliberately separate stages:
 * a pre-existing Firebase Auth user must be explicitly invited.
 */
import {verifyPlatformAdminRequest} from "./verified-platform-admin.mjs";
import {registerSchoolTransaction} from "./firestore-onboarding-adapter.mjs";
import {inviteSchoolAdmin} from "./school-admin-invitation.mjs";

export async function registerSchoolFromVerifiedToken({idToken,input,auth,firestore}) {
 const actor=await verifyPlatformAdminRequest({idToken,auth,firestore});
 return registerSchoolTransaction({actor,input,firestore});
}
export async function inviteSchoolAdminFromVerifiedToken({idToken,schoolId,adminEmail,auth,firestore}) {
 const actor=await verifyPlatformAdminRequest({idToken,auth,firestore});
 return inviteSchoolAdmin({actor,schoolId,adminEmail,auth,firestore});
}
