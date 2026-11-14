/** V47 school-admin student writes; server re-verifies school membership and role. */
import {assertSchoolId} from "./tenant-domain.mjs";
export function createV47StudentWriteClient({getIdToken,fetchImpl}) {
 if(typeof getIdToken!=="function" || typeof fetchImpl!=="function")throw new TypeError("Auth and fetch required");
 return Object.freeze({async saveStudent({schoolId,studentId,mode,values}){
  assertSchoolId(schoolId);
  if(typeof studentId!=="string" || !/^[A-Za-z0-9_-]{1,128}$/.test(studentId) ||
     !["create","update"].includes(mode) || !values || typeof values!=="object" || Array.isArray(values))
   throw new TypeError("Invalid student request");
  const token=await getIdToken();
  if(typeof token!=="string" || !token.trim())throw new Error("Login required");
  const response=await fetchImpl("/api/v47/students/write",{
   method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json",Accept:"application/json"},
   credentials:"same-origin",cache:"no-store",
   body:JSON.stringify({schoolId,studentId,mode,values})
  });
  if(!response?.ok)throw new Error("Student change denied or failed");
  const data=await response.json();
  if(data?.result?.schoolId!==schoolId || data?.result?.studentId!==studentId)
   throw new Error("Invalid student response");
  return data.result;
 }});
}
