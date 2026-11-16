/**
 * V47 browser Firestore gateway for reusing V46 feature code.
 * Requires a school ID obtained from a verified membership, never an arbitrary UI value.
 * Firebase Security Rules must independently enforce the same tenant boundary.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
import {V46_COLLECTION_POLICY} from "./v46-collection-map.mjs";
function safeSegment(id) {
 return typeof id==="string" && id.length>=1 && id.length<=1500 &&
  id!=="." && id!==".." && !id.includes("/") &&
  ![...id].some(char=>char.codePointAt(0)<32 || char.codePointAt(0)===127);
}
function validId(id) {
 if(!safeSegment(id))
  throw new TypeError("Invalid document ID");
 return id;
}
export function createV46BrowserTenantGateway({db,verifiedSchoolId,collectionFn,docFn,getDocsFn,getDocFn,queryFn,limitFn,startAfterFn,orderByFn}) {
 if(!db || [collectionFn,docFn,getDocsFn,getDocFn,queryFn,limitFn].some(fn=>typeof fn!=="function"))
  throw new TypeError("Firebase Firestore read functions required");
 const schoolId=assertSchoolId(verifiedSchoolId);
 const prefix="schools/"+schoolId+"/";
 return Object.freeze({
  schoolId,
  forCollection(path) {
   if(typeof path!=="string" || !path.startsWith(prefix) ||
      path.slice(prefix.length).includes("/") ||
      !Object.hasOwn(V46_COLLECTION_POLICY,path.slice(prefix.length)))
    throw new Error("Unreviewed or cross-school V46 collection path");
   const collectionName=path.slice(prefix.length);
   const category=V46_COLLECTION_POLICY[collectionName];
   if(category==="tenant-server-managed" || category==="tenant-public-publishing")
    throw new Error("Sensitive V46 collection requires separately reviewed access");
   const collectionRef=()=>collectionFn(db,"schools",schoolId,collectionName);
   const issuedCursors=new WeakSet();
   const consumedCursors=new WeakSet();
   return Object.freeze({
    path,
    async list({pageSize=20}={}) {
     if(!Number.isInteger(pageSize) || pageSize<1 || pageSize>50)
      throw new RangeError("Page size must be between 1 and 50");
     const snapshot=await getDocsFn(queryFn(collectionRef(),limitFn(pageSize)));
     if(!Array.isArray(snapshot.docs) || snapshot.docs.length>pageSize)
      throw new TypeError("Invalid Firestore list size response");
     return Object.freeze(snapshot.docs.map(item=>{
      if(!item || !safeSegment(item.id) || item.ref?.path!==path+"/"+item.id || typeof item.data!=="function")
       throw new TypeError("Invalid Firestore list document");
      return Object.freeze({...item.data(),id:item.id});
     }));
    },
    // Cursor-based pagination avoids downloading an entire large school collection.
    // Cursor is the last Firestore DocumentSnapshot returned by a prior page.
    async listPage({pageSize=20,cursor=null}={}) {
     if(!Number.isInteger(pageSize) || pageSize<1 || pageSize>50)
      throw new RangeError("Page size must be between 1 and 50");
     if(typeof orderByFn!=="function" || typeof startAfterFn!=="function")
      throw new TypeError("Firestore cursor pagination adapters required");
     const clauses=[orderByFn("__name__")];
     if(cursor!==null){
      if(typeof cursor!=="object" || typeof cursor.id!=="string" ||
         !safeSegment(cursor.id) || typeof cursor.data!=="function" ||
         cursor.ref?.path!==path+"/"+cursor.id || !issuedCursors.has(cursor) || consumedCursors.has(cursor))
       throw new TypeError("Invalid Firestore page cursor");
      consumedCursors.add(cursor);
      clauses.push(startAfterFn(cursor));
     }
     const snapshot=await getDocsFn(queryFn(collectionRef(),...clauses,limitFn(pageSize)));
     const docs=snapshot.docs;
     if(!Array.isArray(docs) || docs.length>pageSize)
      throw new TypeError("Invalid Firestore page size response");
     // Never issue a cursor from a different collection or malformed snapshot.
     for(const item of docs){
      if(!item || !safeSegment(item.id) || item.ref?.path!==path+"/"+item.id || typeof item.data!=="function")
       throw new TypeError("Invalid Firestore page document");
     }
     if(docs.length===pageSize && docs.length)issuedCursors.add(docs.at(-1));
     return Object.freeze({
      records:Object.freeze(docs.map(doc=>Object.freeze({...doc.data(),id:doc.id}))),
      nextCursor:docs.length===pageSize?docs.at(-1):null
     });
    },
    async get(documentId) {
     const safeDocumentId=validId(documentId);
     const snapshot=await getDocFn(docFn(db,"schools",schoolId,collectionName,safeDocumentId));
     if(!snapshot.exists())return null;
     if(snapshot.id!==safeDocumentId)throw new TypeError("Unexpected Firestore document ID");
     return Object.freeze({...snapshot.data(),id:snapshot.id});
    }
   });
  }
 });
}
