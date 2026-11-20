// Authenticated V46 Excel import preflight for V47. This function reads the live
// school and membership documents before issuing an import context. It does not
// parse spreadsheets or write Firestore. Rules remain the final write authority.
import {verifySchoolSession} from './verified-school-session.mjs';
import {assertV47ImportContext} from './v46-import-school-gate.mjs';
export async function verifyV46ImportPreflight({auth,schoolId,collection,readDocument}){
 const uid=auth?.currentUser?.uid;
 if(typeof uid!=='string'||!uid)throw new Error('Firebase sign-in required');
 const session=await verifySchoolSession({schoolId,uid,readDocument});
 if(auth.currentUser?.uid!==uid)throw new Error('Authentication changed during import verification');
 // Only school_admin is a valid member role. Global super admins must be
 // provisioned as a school admin for this workflow; no client role override.
 if(session.role!=='school_admin')throw new Error('School administrator membership required');
 return assertV47ImportContext({session,schoolId,collection});
}
