// V47 only. Verify membership against live Firestore, not user-supplied role arrays.
// The Firestore rules remain the final authority for every operation.
import {assertSchoolId,assertDocumentId,schoolDocumentPath} from './school-scope.mjs';
import {SCHOOL_ROLES} from './school-membership.mjs';
export async function verifySchoolSession({schoolId,uid,readDocument}){
 assertSchoolId(schoolId);assertDocumentId(uid);
 if(typeof readDocument!=='function')throw new TypeError('Firestore document reader required');
 const school=await readDocument('schools/'+schoolId);
 if(!school||school.active!==true||school.id!==schoolId)throw new Error('School unavailable');
 const membership=await readDocument(schoolDocumentPath(schoolId,'members',uid));
 if(!membership||membership.active!==true||membership.uid!==uid||membership.schoolId!==schoolId||!SCHOOL_ROLES.includes(membership.role))throw new Error('Membership unavailable');
 return Object.freeze({schoolId,uid,role:membership.role,authorization:'firestore-verified-read'});
}
// Pass an authenticated Firebase Firestore instance and the Firebase Auth currentUser.
// Never accept uid from a form or a route parameter.
export async function verifyFirebaseSchoolSession({schoolId,auth,firestore}){
 if(!auth?.currentUser?.uid||!firestore)throw new Error('Sign-in required');
 const {doc,getDoc}=await import('firebase/firestore');
 const user=auth.currentUser;
 const uid=user.uid;
 const session=await verifySchoolSession({schoolId,uid,readDocument:async path=>{
  const snap=await getDoc(doc(firestore,...path.split('/')));
  return snap.exists()?snap.data():null;
 }});
 if(auth.currentUser?.uid!==uid)throw new Error('Authentication changed during verification');
 return session;
}
