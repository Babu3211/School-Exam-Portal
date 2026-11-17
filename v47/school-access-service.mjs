import {assertSchoolId,assertDocumentId} from './school-scope.mjs';
import {resolveSchoolSession} from './school-session.mjs';
// UI convenience only: Firestore security rules enforce actual access.
// An inactive school or a non-member can receive permission-denied on GET.
export async function loadSchoolAccess({db,api,auth,schoolId,uid,isSuperAdmin=false}){
 assertSchoolId(schoolId);assertDocumentId(uid);
 if(!auth?.currentUser?.uid || auth.currentUser.uid!==uid)
  throw new Error('Authenticated user does not match requested membership');
 if(!db||typeof api?.doc!=='function'||typeof api?.getDoc!=='function')
  throw new TypeError('Firestore SDK required');
 if(isSuperAdmin)throw new Error('Super Admin authorization must be verified server-side');
 const denied=()=>resolveSchoolSession({schoolId,schoolActive:false,membership:null});
 try{
  const schoolSnap=await api.getDoc(api.doc(db,'schools',schoolId));
  if(!schoolSnap.exists())return denied();
  const memberSnap=await api.getDoc(api.doc(db,'schools',schoolId,'members',uid));
  return resolveSchoolSession({
   schoolId,schoolActive:schoolSnap.data().active===true,
   membership:memberSnap.exists()?memberSnap.data():null
  });
 }catch(error){
  if(error?.code==='permission-denied'||error?.code==='firestore/permission-denied')return denied();
  throw error;
 }
}
