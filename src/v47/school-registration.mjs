/**
 * V47 school registration validation and authorization contract.
 * Pure, offline draft only. Never writes to V46 or Firestore.
 * Registration must be executed by a trusted server with verified super-admin UID.
 */
import {createSchoolDraft} from "./tenant-domain.mjs";
const CODE=/^[A-Za-z0-9_-]{3,32}$/;
export function prepareSchoolRegistration(input) {
  if (!input || typeof input!=="object") throw new TypeError("Registration required");
  const {schoolId,name,iemisCode,annualFee=0,isOwnerSchool=false,adminEmail}=input;
  if (typeof iemisCode!=="string" || !CODE.test(iemisCode.trim())) throw new TypeError("Invalid IEMIS code");
  if (typeof adminEmail!=="string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) throw new TypeError("Valid school admin email required");
  const school=createSchoolDraft({schoolId,name,iemisCode,annualFee,isOwnerSchool});
  return Object.freeze({school,adminEmail:adminEmail.trim().toLowerCase()});
}
export function requireSuperAdmin(actor) {
  // Server must derive this trusted property from verified auth and server-side admin membership.
  if (!actor || actor.verifiedSuperAdmin!==true || typeof actor.uid!=="string" || !actor.uid) {
    throw new Error("Verified platform super admin required");
  }
  return actor.uid;
}
export function createRegistrationCommand(actor,input) {
  const actorUid=requireSuperAdmin(actor);
  const draft=prepareSchoolRegistration(input);
  return Object.freeze({actorUid,...draft});
}
