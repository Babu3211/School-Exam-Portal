/**
 * V46-to-V47 tenant-aware read session.
 * Validates current Firebase membership before and after every data read.
 * Never returns Firestore references or exposes write methods.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
import {verifyV47BrowserMembership} from "./browser-membership-guard.mjs";
import {createV46TenantReadAdapter} from "./v46-tenant-read-adapter.mjs";
export function createV46VerifiedReadSession({
 db,auth,schoolId,docFn,getDocFn,collectionFn,getDocsFn,queryFn,limitFn
}) {
 if(!auth || typeof auth!=="object" || typeof docFn!=="function" || typeof getDocFn!=="function")
  throw new TypeError("Auth and Firebase read functions required");
 assertSchoolId(schoolId);
 const readMembership=async()=>{
  const uid=auth.currentUser?.uid;
  if(typeof uid!=="string" || !uid)throw new Error("Sign in required");
  const [school,member]=await Promise.all([
   getDocFn(docFn(db,"schools",schoolId)),
   getDocFn(docFn(db,"schools",schoolId,"members",uid))
  ]);
  if(auth.currentUser?.uid!==uid || !school.exists() || !member.exists())
   throw new Error("School access unavailable");
  return verifyV47BrowserMembership({schoolId,uid,school:school.data(),member:member.data()});
 };
 const perform=async operation=>{
  const before=await readMembership();
  const adapter=createV46TenantReadAdapter({
   db,verifiedSchoolId:before.schoolId,
   verifiedMembership:{schoolId:before.schoolId,active:true,roles:[...before.roles]},
   collectionFn,docFn,getDocFn,getDocsFn,queryFn,limitFn
  });
  const result=await operation(adapter);
  const after=await readMembership();
  if(before.uid!==after.uid || before.roles.join(",")!==after.roles.join(","))
   throw new Error("School access changed during read");
  return result;
 };
 return Object.freeze({
  list:(name,options)=>perform(adapter=>adapter.list(name,options)),
  get:(name,id)=>perform(adapter=>adapter.get(name,id))
 });
}
