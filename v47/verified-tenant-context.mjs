// V47-only authenticated tenant context for staged V46 feature integration.
// No V46 production imports, no hardcoded administrator identity, no implicit school.
import {verifySchoolSession} from './verified-school-session.mjs';
import {assertV47TenantCollection} from './rewrite-v46-firestore-paths.mjs';

export async function createVerifiedTenantContext({schoolId,auth,readDocument}){
 const uid=auth?.currentUser?.uid;
 if(!uid)throw new Error('Sign-in required');
 const session=await verifySchoolSession({schoolId,uid,readDocument});
 if(auth.currentUser?.uid!==uid)throw new Error('Authentication changed during school verification');
 const ensureCurrent=()=>{
  if(auth.currentUser?.uid!==uid)throw new Error('Authentication changed; verify school again');
  if(session.schoolId!==schoolId)throw new Error('School changed; verify again');
  return session;
 };
 return Object.freeze({
  schoolId:session.schoolId,uid:session.uid,role:session.role,
  collectionSegments(name){ensureCurrent();return ['schools',session.schoolId,assertV47TenantCollection(name)]},
  documentSegments(name,id){
   ensureCurrent();
   if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw new Error('Invalid document ID');
   return ['schools',session.schoolId,assertV47TenantCollection(name),id];
  },
  assertRead(){return ensureCurrent()},
  assertWrite(){ensureCurrent();if(session.role!=='school_admin')throw new Error('School Admin permission required');return session}
 });
}
