// Scoped Firestore adapter for integrating V46 screens in V47 staging.
// This is not a migration of V46 Firebase credentials or production data.
export function createVerifiedTenantFirestore({db,api,context}){
 if(!db||!api||!context||typeof context.collectionSegments!=='function'||typeof context.documentSegments!=='function'||typeof context.revalidateWrite!=='function')throw new TypeError('Verified tenant Firestore dependencies required');
 if(typeof api.collection!=='function'||typeof api.doc!=='function'||typeof api.getDocs!=='function'||typeof api.getDoc!=='function')throw new TypeError('Firestore read methods required');
 const collectionRef=name=>api.collection(db,...context.collectionSegments(name));
 const documentRef=(name,id)=>api.doc(db,...context.documentSegments(name,id));
 return Object.freeze({
  async list(name){context.assertRead();const result=await api.getDocs(collectionRef(name));context.assertRead();return result},
  async get(name,id){context.assertRead();const result=await api.getDoc(documentRef(name,id));context.assertRead();return result},
  // Writes intentionally unavailable until create-only transaction and rules parity are verified.
  async create(){throw new Error('Staged V46 record writes disabled pending verified transaction and rules parity');} });
}
