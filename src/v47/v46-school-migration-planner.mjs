/**
 * V46 -> V47 data migration planner. Read-only by design: no Firebase SDK,
 * no credentials, no data writes, no deployment. Input is an offline manifest
 * of collection names and counts, NOT student data.
 */
import {V46_COLLECTION_POLICY} from "./v46-collection-map.mjs";
import {assertSchoolId} from "./tenant-domain.mjs";
export function planV46SchoolMigration({schoolId,sourceProject,targetProject,counts}){
 const id=assertSchoolId(schoolId);
 if(sourceProject!=="exam-portal-smss-95016" || targetProject!=="smss-exam-portal-v47")
  throw Error("Unexpected migration project: production data must remain untouched");
 if(!counts || typeof counts!=="object" || Array.isArray(counts))
  throw TypeError("Offline collection counts required");
 const entries=[];
 for(const [name,count] of Object.entries(counts)){
  if(!Object.hasOwn(V46_COLLECTION_POLICY,name))throw Error("Unreviewed collection: "+name);
  if(!Number.isSafeInteger(count)||count<0)throw TypeError("Invalid count: "+name);
  const policy=V46_COLLECTION_POLICY[name];
  entries.push(Object.freeze({
   collection:name,sourcePath:name,targetPath:"schools/"+id+"/"+name,
   recordCount:count,
   status:policy==="tenant-private"||policy==="tenant-admin-managed"
    ?"requires-export-and-tenant-validation":"blocked-pending-special-review",
   writeAllowed:false
  }));
 }
 const total=entries.reduce((sum,e)=>sum+e.recordCount,0);
 if(!Number.isSafeInteger(total))throw RangeError("Manifest total exceeds safe integer");
 return Object.freeze({schoolId:id,sourceProject,targetProject,totalRecords:total,
  blockedCollections:entries.filter(e=>e.status.startsWith("blocked")).map(e=>e.collection),
  entries:Object.freeze(entries),readyToExecute:false});
}
