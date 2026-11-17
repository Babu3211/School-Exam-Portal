// Dependency-injected Firebase SDK operations. Caller must supply an authenticated
// Firestore instance connected to the SEPARATE V47 Firebase project.
export function makeRegistryAdapter({db,doc,setDoc}) {
  if(!db||typeof doc!=='function'||typeof setDoc!=='function') throw new TypeError('Firestore dependencies required');
  return {
    async create(path,data) {
      if(typeof path!=='string'||!/^schools\/[A-Za-z0-9_-]{3,64}(?:\/members\/[A-Za-z0-9_-]{1,64})?$/.test(path)) throw new TypeError('Unapproved registry path');
      // setDoc is NOT create-only. This adapter deliberately refuses to fake
      // atomic create semantics. Use a trusted backend transaction or Admin SDK.
      throw new Error('Create-only registry writes require trusted server implementation');
    }
  };
}
