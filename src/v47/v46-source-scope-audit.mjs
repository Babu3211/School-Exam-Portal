/**
 * Audit V46 root Firestore references before full-UI multi-school integration.
 * This is a static source audit, not a deployment or a replacement for
 * Firebase rules. Classify bootstrap/public paths separately from tenant data.
 */
import {V46_COLLECTION_POLICY} from "./v46-collection-map.mjs";
export function auditV46FirestoreSource(html) {
 if(typeof html!=="string" || !html.trim())throw new TypeError("V46 HTML required");
 const calls=[...html.matchAll(/\b(collection|doc)\(db\s*,\s*["']([^"']+)["']/g)]
  .map(match=>Object.freeze({operation:match[1],collection:match[2],offset:match.index}));
 if(!calls.length)throw new Error("No V46 Firestore references found");
 const unknown=[...new Set(calls.map(call=>call.collection).filter(name=>!Object.hasOwn(V46_COLLECTION_POLICY,name)))];
 if(unknown.length)throw new Error("Unclassified V46 Firestore collections: "+unknown.join(", "));
 const categories={};
 for(const call of calls){
  const category=V46_COLLECTION_POLICY[call.collection];
  categories[category]=(categories[category]||0)+1;
 }
 const rootWritesRisk=calls.filter(call=>["tenant-private","tenant-admin-managed","tenant-server-managed"].includes(V46_COLLECTION_POLICY[call.collection]));
 return Object.freeze({
  references:calls.length,
  collections:Object.freeze([...new Set(calls.map(call=>call.collection))].sort()),
  categories:Object.freeze(categories),
  mustScopeBeforeRelease:rootWritesRisk.length,
  bootstrapDependencies:Object.freeze(["user_roles","school_settings","school_public_branding"]),
  safeToDeployWithoutRuntimeMigration:false
 });
}
