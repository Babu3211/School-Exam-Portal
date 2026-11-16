/**
 * V46-to-V47 tenant-aware read session.
 * Validates current Firebase membership before and after every data read.
 * Never returns Firestore references or exposes write methods.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
import {verifyV47BrowserMembership} from "./browser-membership-guard.mjs";
import {createV46TenantReadAdapter} from "./v46-tenant-read-adapter.mjs";
import {createV46BrowserTenantGateway} from "./v46-browser-tenant-gateway.mjs";
export function createV46VerifiedReadSession({
 db,auth,schoolId,docFn,getDocFn,collectionFn,getDocsFn,queryFn,limitFn,startAfterFn,orderByFn
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
 const pagedGateway=typeof startAfterFn==="function" && typeof orderByFn==="function"
  ?createV46BrowserTenantGateway({db,verifiedSchoolId:schoolId,collectionFn,docFn,getDocFn,getDocsFn,queryFn,limitFn,startAfterFn,orderByFn})
  :null;
 const pagedCollections=new Map();
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
  get:(name,id)=>perform(adapter=>adapter.get(name,id)),
  listPage:(name,options)=>perform(async()=>{
   if(!pagedGateway)throw new Error("Firestore pagination functions required");
   if(typeof name!=="string" || !["students","staff","classes","subjects","exams","marks","attendance","certificates","mark_settings","school_settings"].includes(name))
    throw new Error("Unreviewed school collection");
   if(!pagedCollections.has(name))pagedCollections.set(name,pagedGateway.forCollection(`schools/${schoolId}/${name}`));
   return pagedCollections.get(name).listPage(options);
  })
 });
}
