// V47-only helpers. Never import into V46 production without an approved migration.
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const COLLECTION_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
export function assertSchoolId(id) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) throw new TypeError('Invalid school ID');
  return id;
}
export function schoolCollectionPath(schoolId, collection) {
  assertSchoolId(schoolId);
  if (typeof collection !== 'string' || !COLLECTION_PATTERN.test(collection)) throw new TypeError('Invalid collection');
  return `schools/${schoolId}/${collection}`;
}
export function schoolDocumentPath(schoolId, collection, documentId) {
  if (typeof documentId !== 'string' || !ID_PATTERN.test(documentId)) throw new TypeError('Invalid document ID');
  return `${schoolCollectionPath(schoolId, collection)}/${documentId}`;
}
export function schoolMembershipPath(schoolId, uid) {
  return schoolDocumentPath(schoolId, 'members', uid);
}
