/**
 * Dry-run only. Inventory and compare V46 document IDs before any tenant migration.
 * Does not access Firebase; requires caller-supplied snapshots.
 */
import {v47CollectionPlan,V46_COLLECTION_POLICY} from "./v46-collection-map.mjs";
const ID=/^[^/]{1,1500}$/;
export function planV46TenantCopy({schoolId,collections}) {
 if(!collections || typeof collections!=="object" || Array.isArray(collections)) throw new TypeError("Collection snapshots required");
 const entries=[],seen=new Set(),collectionSummary=[];
 const expected=Object.keys(V46_COLLECTION_POLICY);
 const missing=expected.filter(name=>!Object.hasOwn(collections,name));
 if(missing.length) throw new Error("Incomplete V46 migration snapshot; missing collections: "+missing.join(", "));
 for(const [name,docs] of Object.entries(collections)) {
  const policy=v47CollectionPlan(schoolId,name);
  if(!Array.isArray(docs)) throw new TypeError("Expected document array for "+name);
  collectionSummary.push(Object.freeze({collection:name,documents:docs.length,category:policy.category,requiresReview:policy.requiresSpecialReview}));
  for(const doc of docs) {
   if(!doc || typeof doc.id!=="string" || !ID.test(doc.id) || doc.id==="." || doc.id==="..")
    throw new TypeError("Invalid document ID");
   if(!doc.data || typeof doc.data!=="object" || Array.isArray(doc.data))
    throw new TypeError("Invalid document payload");
   const destination=policy.targetPath+"/"+doc.id;
   if(seen.has(destination)) throw new Error("Duplicate destination: "+destination);
   seen.add(destination);
   entries.push(Object.freeze({source:name+"/"+doc.id,destination,category:policy.category,review:policy.requiresSpecialReview}));
  }
 }
 return Object.freeze({
  schoolId,
  totalDocuments:entries.length,
  collectionCount:Object.keys(collections).length,
  reviewedCollections:Object.keys(V46_COLLECTION_POLICY).length,
  requiresApproval:true,
  reviewRequiredDocuments:entries.filter(entry=>entry.review).length,
  collectionSummary:Object.freeze(collectionSummary),
  writesPerformed:0,
  entries:Object.freeze(entries)
 });
}
