/**
 * V47 browser Firestore gateway for reusing V46 feature code.
 * Requires a school ID obtained from a verified membership, never an arbitrary UI value.
 * Firebase Security Rules must independently enforce the same tenant boundary.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
import {V46_COLLECTION_POLICY} from "./v46-collection-map.mjs";
const SAFE_SEGMENT=/^[^/\\u0000-\\u001f\\u007f]{1,1500}$/;
function validId(id) {
 if(typeof id!=="string" || !SAFE_SEGMENT.test(id) || id==="." || id==="..")
  throw new TypeError("Invalid document ID");
 return id;
}
export function createV46BrowserTenantGateway({db,verifiedSchoolId,collectionFn,docFn,getDocsFn,getDocFn,queryFn,limitFn}) {
 if(!db || [collectionFn,docFn,getDocsFn,getDocFn,queryFn,limitFn].some(fn=>typeof fn!=="function"))
  throw new TypeError("Firebase Firestore read functions required");
 const schoolId=assertSchoolId(verifiedSchoolId);
 const prefix="schools/"+schoolId+"/";
 return Object.freeze({
  forCollection(path) {
   if(typeof path!=="string" || !path.startsWith(prefix) ||
      path.slice(prefix.length).includes("/") ||
      !Object.hasOwn(V46_COLLECTION_POLICY,path.slice(prefix.length)))
    throw new Error("Unreviewed or cross-school V46 collection path");
   const collectionName=path.slice(prefix.length);
   const collectionRef=()=>collectionFn(db,"schools",schoolId,collectionName);
   return Object.freeze({
    path,
    async list({pageSize=20}={}) {
     if(!Number.isInteger(pageSize) || pageSize<1 || pageSize>50)
      throw new RangeError("Page size must be between 1 and 50");
     const snapshot=await getDocsFn(queryFn(collectionRef(),limitFn(pageSize)));
     return snapshot.docs.map(doc=>Object.freeze({id:doc.id,...doc.data()}));
    },
    async get(documentId) {
     const snapshot=await getDocFn(docFn(db,"schools",schoolId,collectionName,validId(documentId)));
     return snapshot.exists()?Object.freeze({id:snapshot.id,...snapshot.data()}):null;
    }
   });
  }
 });
}
