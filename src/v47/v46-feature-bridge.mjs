/**
 * V47 integration seam: reuse existing V46 feature implementations unchanged.
 * Only replace the data gateway at the V47 tenant boundary.
 * This is a wiring contract, not a deployed V46 integration.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
import {schoolResourcePath} from "./school-data-paths.mjs";
const FEATURE_COLLECTIONS=Object.freeze({students:"students",staff:"staff",classes:"classes",subjects:"subjects",exams:"exams",marks:"marks",attendance:"attendance",certificates:"certificates",markSettings:"mark_settings",settings:"school_settings",results:"public_results"});
const FEATURES=Object.freeze(Object.keys(FEATURE_COLLECTIONS));
export function createV46FeatureBridge({session,legacyFeatures,tenantGateway}) {
 if(!session || typeof session!=="object") throw new TypeError("Verified session required");
 const schoolId=assertSchoolId(session.schoolId);
 if(!Array.isArray(session.roles) || !session.roles.length || session.roles.some(role=>typeof role!=="string" || !role.trim()) || new Set(session.roles).size!==session.roles.length || session.roles.includes("viewer") && session.roles.some(r=>r!=="viewer"))
   throw new Error("Invalid school role session");
 const verifiedRoles=Object.freeze([...session.roles]);
 const readOnly=verifiedRoles.includes("viewer");
 if(!legacyFeatures || typeof legacyFeatures!=="object" || !tenantGateway || typeof tenantGateway.forCollection!=="function")
   throw new TypeError("V46 features and tenant data gateway required");
 const result={};
 for(const feature of FEATURES) {
   const implementation=legacyFeatures[feature];
   if(typeof implementation!=="function") throw new TypeError("Missing V46 feature: "+feature);
   const scopedGateway=tenantGateway.forCollection(schoolResourcePath(schoolId,FEATURE_COLLECTIONS[feature]));
   if(!scopedGateway || typeof scopedGateway!=="object") throw new TypeError("Invalid tenant gateway");
   result[feature]=(...args)=>implementation(Object.freeze({schoolId,roles:verifiedRoles,readOnly,gateway:scopedGateway}),...args);
 }
 return Object.freeze(result);
}
export const V46_REUSED_FEATURES=FEATURES;
