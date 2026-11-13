/**
 * V47 school-scoped client data paths.
 * Pure route construction; this is NOT authorization.
 * Only use after server-verified school session and deployed tenant rules.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
import {v47CollectionPlan} from "./v46-collection-map.mjs";
const DOCUMENT_ID=/^[A-Za-z0-9_-]{1,128}$/;
export function schoolResourcePath(schoolId,resource) {
 assertSchoolId(schoolId);
 return v47CollectionPlan(schoolId,resource).targetPath;
}
export function schoolRecordPath(schoolId,resource,documentId) {
 if(typeof documentId!=="string" || !DOCUMENT_ID.test(documentId)) throw new TypeError("Invalid document ID");
 return `${schoolResourcePath(schoolId,resource)}/${documentId}`;
}
export function requireSchoolSessionPath(session,resource,documentId) {
 if(!session || typeof session!=="object" || !Array.isArray(session.roles) || !session.roles.length)
  throw new Error("Verified school session required");
 return schoolRecordPath(session.schoolId,resource,documentId);
}
