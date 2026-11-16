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
 const issuedPageTokens=new WeakMap();
 const consumedPageTokens=new WeakSet();
 const identityOf=membership=>membership.uid+"|"+[...membership.roles].sort().join(",");
 const perform=async operation=>{
  const before=await readMembership();
  const identity=identityOf(before);
  const adapter=createV46TenantReadAdapter({
   db,verifiedSchoolId:before.schoolId,
   verifiedMembership:{schoolId:before.schoolId,active:true,roles:[...before.roles]},
   collectionFn,docFn,getDocFn,getDocsFn,queryFn,limitFn
  });
  const result=await operation(adapter,identity);
  const after=await readMembership();
  if(identity!==identityOf(after))
   throw new Error("School access changed during read");
  return result;
 };
 return Object.freeze({
  list:(name,options)=>perform(adapter=>adapter.list(name,options)),
  get:(name,id)=>perform(adapter=>adapter.get(name,id)),
  listPage:async(name,options)=>{
   const result=await perform(async(_adapter,identity)=>{
   if(!pagedGateway)throw new Error("Firestore pagination functions required");
   if(typeof name!=="string" || !["students","staff","classes","subjects","exams","marks","attendance","certificates","mark_settings","school_settings"].includes(name))
    throw new Error("Unreviewed school collection");
   if(!pagedCollections.has(name))pagedCollections.set(name,pagedGateway.forCollection(`schools/${schoolId}/${name}`));
   const {cursor=null,...rest}=options??{};
   let internalCursor=null;
   if(cursor!==null){
    if(typeof cursor!=="object" || !issuedPageTokens.has(cursor))throw new TypeError("Invalid page token");
    const issued=issuedPageTokens.get(cursor);
    if(issued.name!==name || issued.identity!==identity || consumedPageTokens.has(cursor))
     throw new TypeError("Page token is expired or belongs to another collection or member");
    consumedPageTokens.add(cursor);
    internalCursor=issued.snapshot;
   }
   const page=await pagedCollections.get(name).listPage({...rest,cursor:internalCursor});
   return {records:page.records,cursorSnapshot:page.nextCursor,identity};
   });
   // Do not issue reusable page tokens until the post-read membership check passes.
   const nextCursor=result.cursorSnapshot?Object.freeze({pageToken:true}):null;
   if(nextCursor)issuedPageTokens.set(nextCursor,{name,identity:result.identity,snapshot:result.cursorSnapshot});
   return Object.freeze({records:result.records,nextCursor});
  }
 });
}
