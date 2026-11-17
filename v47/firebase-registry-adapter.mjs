// V47-only Firestore registry adapter. Atomic transactions reject duplicates.
// Firestore security rules remain the final authority for Super Admin access.
export function makeRegistryAdapter({db,doc,runTransaction}) {
  if(!db||typeof doc!=='function'||typeof runTransaction!=='function')
    throw new TypeError('Firestore transaction dependencies required');
  return {
    async create(path,data) {
      if(typeof path!=='string'||!/^schools\/[A-Za-z0-9_-]{3,64}(?:\/members\/[A-Za-z0-9_-]{1,64})?$/.test(path))
        throw new TypeError('Unapproved registry path');
      if(!data||typeof data!=='object'||Array.isArray(data))
        throw new TypeError('Invalid registry document');
      const ref=doc(db,path);
      return runTransaction(db,async tx=>{
        const existing=await tx.get(ref);
        if(existing.exists()) throw new Error('Registry document already exists');
        tx.set(ref,data);
        return {path};
      });
    }
  };
}
