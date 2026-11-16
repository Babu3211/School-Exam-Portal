/**
 * Compatibility boundary for migrating V46 collection(db, "students") reads.
 * Only verified tenant-private collections are accessible. No writes, root
 * collection access, public publishing or backup/restore are exposed.
 */
import {createV46TenantPathResolver} from "./v46-tenant-path-resolver.mjs";
import {V46_COLLECTION_POLICY} from "./v46-collection-map.mjs";

export function createV46TenantReadAdapter({
 db,verifiedSchoolId,verifiedMembership,collectionFn,docFn
}) {
 if(typeof collectionFn!=="function" || typeof docFn!=="function")
  throw new TypeError("Firestore collection/doc functions required");
 const paths=createV46TenantPathResolver({verifiedSchoolId,verifiedMembership});
 const safeName=name=>{
  if(typeof name!=="string" || !Object.hasOwn(V46_COLLECTION_POLICY,name) ||
     !["tenant-private","tenant-admin-managed"].includes(V46_COLLECTION_POLICY[name]))
   throw new Error("Legacy collection cannot be accessed from the browser");
  return paths.collection(name);
 };
 const safeId=id=>{
  if(typeof id!=="string" || !id || id.length>1500 || id==="." || id===".." ||
     id.includes("/") || [...id].some(char=>char.codePointAt(0)<32 || char.codePointAt(0)===127))
   throw new TypeError("Single document ID required");
  return id;
 };
 return Object.freeze({
  schoolId:paths.schoolId,
  collection:name=>collectionFn(db,safeName(name)),
  doc:(name,id)=>docFn(db,safeName(name),safeId(id))
 });
}
