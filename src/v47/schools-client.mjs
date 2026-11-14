/**
 * Authenticated V47 browser school chooser. No client-supplied UID or roles.
 * Only server-verified schools are returned. No writes or V46 mutations.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
export function createV47SchoolsClient({getIdToken,fetchImpl,endpoint="/api/v47/schools"}) {
 if(typeof getIdToken!=="function" || typeof fetchImpl!=="function")
  throw new TypeError("Token provider and fetch implementation required");
 if(typeof endpoint!=="string" || !/^\/[A-Za-z0-9/_-]+$/.test(endpoint))
  throw new TypeError("Same-origin endpoint path required");
 return Object.freeze({
  async listSchools() {
   const token=await getIdToken();
   if(typeof token!=="string" || !token.trim())throw new Error("Login required");
   const response=await fetchImpl(endpoint,{
    method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},
    credentials:"same-origin",cache:"no-store"
   });
   if(!response?.ok)throw new Error("School list unavailable or access denied");
   const payload=await response.json();
   if(!Array.isArray(payload?.schools) || payload.schools.length>100)
    throw new Error("Invalid school list response");
   const seen=new Set();
   return Object.freeze(payload.schools.map(school=>{
    if(!school || typeof school!=="object")throw new Error("Invalid school");
    assertSchoolId(school.schoolId);
    if(seen.has(school.schoolId))throw new Error("Duplicate school");
    seen.add(school.schoolId);
    if(typeof school.schoolName!=="string" || !school.schoolName.trim() ||
      !Array.isArray(school.roles) || !school.roles.length ||
      school.roles.some(role=>!["school_admin","class_teacher","subject_teacher","viewer"].includes(role)))
      throw new Error("Invalid school membership");
    return Object.freeze({schoolId:school.schoolId,schoolName:school.schoolName,
     roles:Object.freeze([...school.roles])});
   }));
  }
 });
}
