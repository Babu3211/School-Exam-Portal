/**
 * Explicit V46 -> V47 collection classification.
 * Planning only: no live data reads, writes, migration or deployment.
 * Public collections need special authorization and publishing review.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
export const V46_COLLECTION_POLICY=Object.freeze({
 audit_logs:"tenant-server-managed",
 attendance:"tenant-private",
 certificates:"tenant-private",
 classes:"tenant-private",
 exams:"tenant-private",
 mark_settings:"tenant-private",
 marks:"tenant-private",
 public_result_exams:"tenant-public-publishing",
 public_result_lookup:"tenant-public-publishing",
 public_results:"tenant-public-publishing",
 school_gallery:"tenant-public-publishing",
 school_public_branding:"tenant-public-publishing",
 school_settings:"tenant-admin-managed",
 staff:"tenant-private",
 students:"tenant-private",
 subjects:"tenant-private",
 user_roles:"tenant-server-managed"
});
export function v47CollectionPlan(schoolId,legacyCollection) {
 assertSchoolId(schoolId);
 if(!Object.hasOwn(V46_COLLECTION_POLICY,legacyCollection))
   throw new TypeError("Unreviewed V46 collection: "+String(legacyCollection));
 const category=V46_COLLECTION_POLICY[legacyCollection];
 return Object.freeze({
  legacyCollection,
  category,
  targetPath:`schools/${schoolId}/${legacyCollection}`,
  // A collection classification is never permission to write. Actual writes
  // require deployed rules, verified membership and schema-specific checks.
  browserWriteAllowed:false,
  requiresSpecialReview:category!=="tenant-private"
 });
}
