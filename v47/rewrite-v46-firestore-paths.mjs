// Pure source transformation for V46 -> V47 staging. Never modify production V46.
// Every legacy collection must be classified; unknown references fail closed.
export const V46_COLLECTIONS=Object.freeze([
 'audit_logs','students','certificates','school_public_branding','school_gallery','school_settings',
 'staff','classes','user_roles','subjects','marks','mark_settings','exams',
 'public_result_exams','public_result_lookup','public_results','attendance'
]);
export const V47_TENANT_COLLECTIONS=Object.freeze([...V46_COLLECTIONS]);
export function rewriteV46FirestorePaths(source){
 if(typeof source!=='string'||!source.length)throw new TypeError('V46 source required');
 const seen=new Set();
 const rewritten=source.replace(/\b(collection|doc)\(\s*db\s*,\s*(['"`])([a-z_]+)\2/g,(match,kind,quote,name)=>{
  if(!V47_TENANT_COLLECTIONS.includes(name))throw new Error('Unreviewed V46 Firestore collection: '+name);
  seen.add(name);
  return kind+'(db, "schools", activeSchoolId, '+quote+name+quote;
 });
 for(const name of V46_COLLECTIONS)if(!seen.has(name))throw new Error('Expected V46 collection not found: '+name);
 // Do not silently rewrite dynamic paths, nested references or database rules.
 const legacyLiteral=/\b(?:collection|doc)\(\s*db\s*,\s*(['"`])([a-z_]+)\1/g;
 for(const match of rewritten.matchAll(legacyLiteral))if(match[2]!=='schools')throw new Error('Unscoped literal Firestore reference remains: '+match[2]);
 return {source:rewritten,collections:[...seen].sort()};
}
