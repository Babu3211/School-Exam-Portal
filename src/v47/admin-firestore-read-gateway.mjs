/**
 * Read-only Firestore Admin SDK gateway for verified V47 server handlers.
 * Not suitable for direct browser use. Authentication happens in the caller.
 */
export function createAdminFirestoreReadGateway(firestore) {
 if(!firestore || typeof firestore.collection!=="function")
  throw new TypeError("Firestore Admin SDK required");
 return Object.freeze({
  async queryCollection(path,filters) {
   if(typeof path!=="string" || !/^schools\/[A-Za-z0-9_-]{8,64}\/marks$/.test(path))
    throw new TypeError("Tenant marks collection path required");
   if(!Array.isArray(filters) || filters.length<2 || filters.length>3 ||
      filters[0]?.[0]!=="className" || filters[0]?.[1]!=="==" ||
      filters[1]?.[0]!=="subject" || filters[1]?.[1]!=="==" ||
      (filters.length===3 && (filters[2]?.[0]!=="section" || filters[2]?.[1]!=="==")))
    throw new TypeError("Unsupported marks query");
   for(const filter of filters) {
    if(!Array.isArray(filter) || filter.length!==3 ||
       typeof filter[2]!=="string" || !filter[2].trim())
      throw new TypeError("Invalid marks filter");
   }
   let query=firestore.collection(path);
   for(const [field,operator,value] of filters) query=query.where(field,operator,value);
   const snapshot=await query.get();
   return snapshot.docs.map(doc=>({...doc.data(),id:doc.id}));
  }
 });
}
