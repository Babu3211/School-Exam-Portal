/**
 * Server-only, bounded V46-compatible school collection reader.
 * Supports the remaining private school screens without root collection access.
 * All identity and tenant checks are performed server-side.
 */
import {loadVerifiedSchoolSession} from "./verified-school-session.mjs";
import {V46_COLLECTION_POLICY} from "./v46-collection-map.mjs";
import {v47V46CollectionSegments} from "./v46-tenant-firestore-paths.mjs";
const READABLE=new Set(Object.entries(V46_COLLECTION_POLICY)
 .filter(([,policy])=>policy==="tenant-private" || policy==="tenant-admin-managed")
 .map(([name])=>name));
export async function readVerifiedV46Records({idToken,schoolId,collection,auth,firestore,maxRows=100}) {
 if(!READABLE.has(collection))throw new Error("Collection not available through private reader");
 if(!Number.isSafeInteger(maxRows)||maxRows<1||maxRows>500)throw new TypeError("Invalid row limit");
 const session=await loadVerifiedSchoolSession({idToken,schoolId,auth,firestore});
 if(session.schoolId!==schoolId)throw new Error("School membership verification failed");
 if(typeof firestore?.collection!=="function")throw new TypeError("Firestore Admin SDK required");
 const path=v47V46CollectionSegments({schoolId:session.schoolId,collection}).join("/");
 const snapshot=await firestore.collection(path).limit(maxRows).get();
 if(!Array.isArray(snapshot.docs))throw new Error("Invalid Firestore snapshot");
 return Object.freeze(snapshot.docs.map(doc=>Object.freeze({...doc.data(),id:doc.id})));
}
