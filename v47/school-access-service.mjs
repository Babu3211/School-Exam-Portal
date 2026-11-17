import {assertSchoolId,assertDocumentId} from './school-scope.mjs';
import {resolveSchoolSession} from './school-session.mjs';
// Always retrieve membership from the authenticated V47 Firestore database.
// The caller-supplied schoolId is a locator, never an authorization grant.
export async function loadSchoolAccess({db,api,schoolId,uid,isSuperAdmin=false}){
 assertSchoolId(schoolId);assertDocumentId(uid);
 if(!db||typeof api?.doc!=='function'||typeof api?.getDoc!=='function')
  throw new TypeError('Firestore SDK required');
 if(isSuperAdmin)throw new Error('Super Admin authorization must be verified server-side');
 const schoolSnap=await api.getDoc(api.doc(db,'schools',schoolId));
 if(!schoolSnap.exists())return resolveSchoolSession({schoolId,schoolActive:false});
 const memberSnap=await api.getDoc(api.doc(db,'schools',schoolId,'members',uid));
 return resolveSchoolSession({
  schoolId,schoolActive:schoolSnap.data().active===true,
  membership:memberSnap.exists()?memberSnap.data():null
 });
}
