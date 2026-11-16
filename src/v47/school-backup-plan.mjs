/**
 * V47 school-scoped backup manifest planning only.
 * No Firestore access, export, restore, or privileged operation.
 * Server-managed and public publishing data are excluded until reviewed.
 */
import {assertSchoolId,schoolCollectionPath} from "./tenant-domain.mjs";
import {V46_COLLECTION_POLICY} from "./v46-collection-map.mjs";
const INCLUDED=Object.freeze(Object.entries(V46_COLLECTION_POLICY)
 .filter(([,policy])=>policy==="tenant-private" || policy==="tenant-admin-managed")
 .map(([name])=>name).sort());
export function planV47SchoolBackup({schoolId,collections=INCLUDED}) {
 const id=assertSchoolId(schoolId);
 if(!Array.isArray(collections) || collections.length===0 ||
    collections.some(name=>typeof name!=="string" || !INCLUDED.includes(name)) ||
    new Set(collections).size!==collections.length)
  throw new Error("Unreviewed or duplicate backup collection");
 return Object.freeze({
  schoolId:id,
  state:"PLAN_ONLY_NO_EXPORT_OR_RESTORE",
  collections:Object.freeze(collections.map(name=>Object.freeze({
   name,path:schoolCollectionPath(id,name),readOnly:true
  }))),
  excluded:Object.freeze(Object.keys(V46_COLLECTION_POLICY).filter(name=>!INCLUDED.includes(name)).sort())
 });
}
