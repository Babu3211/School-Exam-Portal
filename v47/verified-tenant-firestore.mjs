// Scoped Firestore adapter for integrating V46 screens in V47 staging.
// This is not a migration of V46 Firebase credentials or production data.
export function createVerifiedTenantFirestore({db,api,context}){
 if(!db||!api||!context||typeof context.collectionSegments!=='function'||typeof context.documentSegments!=='function'||typeof context.revalidateWrite!=='function'||typeof context.revalidateRead!=='function')throw new TypeError('Verified tenant Firestore dependencies required');
 if(typeof api.collection!=='function'||typeof api.doc!=='function'||typeof api.getDocs!=='function'||typeof api.getDoc!=='function')throw new TypeError('Firestore read methods required');
 const collectionRef=name=>api.collection(db,...context.collectionSegments(name));
 const documentRef=(name,id)=>api.doc(db,...context.documentSegments(name,id));
 return Object.freeze({
  async list(name){await context.revalidateRead();const result=await api.getDocs(collectionRef(name));await context.revalidateRead();return result},
  async listAll(name,{pageSize=250,maxDocuments=20000}={}){
   if(!Number.isInteger(pageSize)||pageSize<1||pageSize>500||!Number.isSafeInteger(maxDocuments)||maxDocuments<1)throw new RangeError('Invalid pagination limits');
   if(typeof api.query!=='function'||typeof api.orderBy!=='function'||typeof api.documentId!=='function'||typeof api.limit!=='function'||typeof api.startAfter!=='function')throw new Error('Firestore pagination API required');
   const all=[];let cursor=null;
   for(;;){
    await context.revalidateRead();
    const constraints=[api.orderBy(api.documentId())];
    if(cursor!==null)constraints.push(api.startAfter(cursor));
    const requested=Math.min(pageSize,maxDocuments-all.length);
    constraints.push(api.limit(requested));
    const snapshot=await api.getDocs(api.query(collectionRef(name),...constraints));
    await context.revalidateRead();
    if(!snapshot||!Array.isArray(snapshot.docs))throw new Error('Invalid paginated Firestore response');
    if(snapshot.docs.length>requested)throw new Error('Firestore page exceeded requested limit');
    for(const item of snapshot.docs){
     if(!item||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(item.id)||(all.length&&item.id<=all.at(-1).id))throw new Error('Invalid Firestore pagination cursor');
     if(item.ref?.path!==undefined&&item.ref.path!==context.collectionSegments(name).join('/')+'/'+item.id)throw new Error('Cross-tenant paginated Firestore record');
     all.push(item);
    }
    if(snapshot.docs.length<requested)break;
    if(all.length>=maxDocuments){
     // Probe for one additional document: exactly maxDocuments is complete,
     // but maxDocuments+1 must fail rather than silently truncate a report.
     const next=snapshot.docs.at(-1).id;
     await context.revalidateRead();
     const probe=await api.getDocs(api.query(collectionRef(name),api.orderBy(api.documentId()),api.startAfter(next),api.limit(1)));
     await context.revalidateRead();
     if(!probe||!Array.isArray(probe.docs)||probe.docs.length>1)throw new Error('Invalid pagination probe response');
     if(probe.docs.length&&probe.docs[0]?.ref?.path!==undefined&&probe.docs[0].ref.path!==context.collectionSegments(name).join('/')+'/'+probe.docs[0].id)throw new Error('Cross-tenant paginated Firestore record');
     if(probe.docs.length)throw new Error('Report pagination document limit reached; result incomplete');
     break;
    }
    const next=snapshot.docs.at(-1).id;
    if(cursor!==null&&next<=cursor)throw new Error('Firestore pagination cursor did not advance');
    cursor=next;
   }
   await context.revalidateRead();
   return Object.freeze({docs:Object.freeze(all)});
  },
  async get(name,id){await context.revalidateRead();const result=await api.getDoc(documentRef(name,id));await context.revalidateRead();return result},
  // Writes intentionally unavailable until create-only transaction and rules parity are verified.
  async create(){throw new Error('Staged V46 record writes disabled pending verified transaction and rules parity');} });
}
