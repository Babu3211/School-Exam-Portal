// Pure source transformation for V46 -> V47 staging. Never modify production V46.
// Every legacy collection must be classified; unknown references fail closed.
export const V46_COLLECTIONS=Object.freeze([
 'audit_logs','students','certificates','school_public_branding','school_gallery','school_settings',
 'staff','classes','user_roles','subjects','marks','mark_settings','exams','cdc_observations',
 'public_result_exams','public_result_lookup','public_results','attendance'
]);
export const V47_TENANT_COLLECTIONS=Object.freeze([...V46_COLLECTIONS]);
// Guard dynamic backup/restore/dashboard paths; never trust arbitrary collection names.
export function assertV47TenantCollection(name){
 if(typeof name!=='string'||!V47_TENANT_COLLECTIONS.includes(name))throw new Error('Unreviewed V47 tenant collection: '+String(name));
 return name;
}
// Audit V46 source before anyone treats a transformed HTML file as a V47 app.
// Replacing Firestore paths alone cannot safely migrate authentication or hosting.
export function auditV46TenantIntegration(source){
 if(typeof source!=='string'||!source.length)throw new TypeError('V46 source required');
 const blockers=[];
 if(/\bconst\s+ADMIN_UID\s*=/.test(source))blockers.push('V46 hard-coded admin UID must be replaced by verified V47 school membership');
 if(/\b(?:const|let|var)\s+firebaseConfig\s*=/.test(source))blockers.push('V46 Firebase configuration must be replaced with isolated V47 configuration');
 if(!/\bactiveSchoolId\b/.test(source))blockers.push('Authenticated activeSchoolId binding is missing');
 if(!/\bassertV47TenantCollection\b/.test(source))blockers.push('Dynamic collection guard must be available in the transformed module');
 blockers.push('Verified Firebase Auth school membership, scoped permissions and V47 hosting have not been established by this source audit');
 return Object.freeze({ready:false,blockers:Object.freeze(blockers)});
}
export function rewriteV46FirestorePaths(source){
 if(typeof source!=='string'||!source.length)throw new TypeError('V46 source required');
 const seen=new Set();
 const rewritten=source.replace(/\b(collection|doc)\(\s*db\s*,\s*(['"`])([a-z_]+)\2/g,(match,kind,quote,name)=>{
  if(!V47_TENANT_COLLECTIONS.includes(name))throw new Error('Unreviewed V46 Firestore collection: '+name);
  seen.add(name);
  return kind+'(db, "schools", activeSchoolId, '+quote+name+quote;
 });
 // V46 dashboard counts, backup and restore use a variable collection name.
 // Scope these three call sites too; their allowlisted values require a separate review.
 let dynamicCount=0;
 const dynamicScoped=rewritten.replace(/\b(collection|doc)\(\s*db\s*,\s*name\b/g,(match,kind)=>{
  dynamicCount++;return kind+'(db, "schools", activeSchoolId, assertV47TenantCollection(name)';
 });
 if(dynamicCount!==3)throw new Error('V46 dynamic collection/document call count changed: '+dynamicCount);
 for(const name of V46_COLLECTIONS)if(!seen.has(name))throw new Error('Expected V46 collection not found: '+name);
 // Do not silently rewrite dynamic paths, nested references or database rules.
 const legacyLiteral=/\b(?:collection|doc)\(\s*db\s*,\s*(['"`])([a-z_]+)\1/g;
 for(const match of dynamicScoped.matchAll(legacyLiteral))if(match[2]!=='schools')throw new Error('Unscoped literal Firestore reference remains: '+match[2]);
 if(/\b(?:collection|doc)\(\s*db\s*,\s*name\b/.test(dynamicScoped))throw new Error('Unscoped dynamic Firestore reference remains');
 return {source:dynamicScoped,collections:[...seen].sort(),dynamicCount};
}
