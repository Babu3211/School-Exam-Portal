/**
 * V47 tenant domain primitives. PURE / INERT: not imported by V46 pages.
 * No Firebase SDK, network, database, or production side effects.
 */
export const SCHOOL_STATUS = Object.freeze({ACTIVE:"active",SUSPENDED:"suspended",PENDING:"pending"});
export const SUBSCRIPTION_STATUS = Object.freeze({FREE:"free",PAID:"paid",DUE:"due",GRACE:"grace",EXPIRED:"expired"});
// Legacy isolated prototype IDs remain readable; production V47 uses numeric
// 5–20 digit IEMIS school IDs. Never accept slashes, dots or whitespace.
const ID_PATTERN=/^(?:[0-9]{5,20}|[a-zA-Z0-9_-]{8,64})$/;
export function assertSchoolId(schoolId) {
  if (typeof schoolId!=="string" || !ID_PATTERN.test(schoolId)) throw new TypeError("Invalid immutable school ID");
  return schoolId;
}
export function schoolDocumentPath(schoolId) { return `schools/${assertSchoolId(schoolId)}`; }
export function schoolCollectionPath(schoolId, collection) {
  const allowed=["students","staff","classes","subjects","exams","marks","attendance","cdc_observations","settings","school_settings","mark_settings","certificates","assignments","members","invitations","results","subscriptions"];
  if (!allowed.includes(collection)) throw new TypeError("Unsupported school collection");
  return `${schoolDocumentPath(schoolId)}/${collection}`;
}
export function annualFeeNpr(value) {
  if (!Number.isSafeInteger(value) || value<0) throw new TypeError("Annual fee must be nonnegative integer NPR");
  return value;
}
export function createSchoolDraft({schoolId,name,iemisCode,annualFee=0,isOwnerSchool=false}) {
  assertSchoolId(schoolId);
  if (typeof name!=="string" || !name.trim()) throw new TypeError("School name required");
  if (typeof iemisCode!=="string" || !iemisCode.trim()) throw new TypeError("IEMIS code required");
  if (typeof isOwnerSchool!=="boolean") throw new TypeError("Invalid owner school flag");
  return Object.freeze({
    schoolId,name:name.trim(),iemisCode:iemisCode.trim(),
    annualFeeNpr:isOwnerSchool?0:annualFeeNpr(annualFee),
    status:SCHOOL_STATUS.PENDING,
    subscriptionStatus:isOwnerSchool?SUBSCRIPTION_STATUS.FREE:SUBSCRIPTION_STATUS.DUE
  });
}
