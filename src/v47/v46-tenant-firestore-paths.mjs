/**
 * V46 collection/document compatibility path mapper for V47 school isolation.
 * Pure and inert; never touches V46 production, Firestore, or Firebase rules.
 * A selected schoolId MUST come from a verified server-side membership.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
import {V46_COLLECTION_POLICY} from "./v46-collection-map.mjs";
const SEGMENT=/^[^/\u0000-\u001f\u007f]{1,1500}$/;
function validateCollection(collection) {
 if(typeof collection!=="string" || !Object.hasOwn(V46_COLLECTION_POLICY,collection))
  throw new TypeError("Unreviewed V46 collection");
 return collection;
}
function validateDocumentId(id) {
 if(typeof id!=="string" || !SEGMENT.test(id) || id==="." || id==="..")
  throw new TypeError("Invalid document ID");
 return id;
}
export function v47V46CollectionSegments({schoolId,collection}) {
 return Object.freeze(["schools",assertSchoolId(schoolId),validateCollection(collection)]);
}
export function v47V46DocumentSegments({schoolId,collection,documentId}) {
 return Object.freeze([...v47V46CollectionSegments({schoolId,collection}),validateDocumentId(documentId)]);
}
/** Inject modular Firebase collection()/doc() functions; do not use root V46 collections. */
export function createV47V46ScopedRefs({db,collectionFn,docFn,verifiedSchoolId}) {
 if(!db || typeof collectionFn!=="function" || typeof docFn!=="function")
  throw new TypeError("Firebase modular Firestore functions required");
 const schoolId=assertSchoolId(verifiedSchoolId);
 return Object.freeze({
  schoolId,
  collection(collection){return collectionFn(db,...v47V46CollectionSegments({schoolId,collection}));},
  doc(collection,documentId){return docFn(db,...v47V46DocumentSegments({schoolId,collection,documentId}));}
 });
}
