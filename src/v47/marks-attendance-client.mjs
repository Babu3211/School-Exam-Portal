/**
 * Isolated V47 browser reads. No V46 page changes and no direct Firestore reads.
 * Authorization remains exclusively in server handlers.
 */
export function createV47ExamReadClient({getIdToken,fetchImpl}) {
 if(typeof getIdToken!=="function" || typeof fetchImpl!=="function")
  throw new TypeError("Token provider and fetch implementation required");
 async function request(resource,params) {
  const allowed=resource==="marks"?["schoolId","className","subject","section"]:
   ["schoolId","className","date","attendanceType"];
  const required=resource==="marks"?["schoolId","className","subject"]:
   ["schoolId","className","date"];
  if(!params || typeof params!=="object" || Array.isArray(params) ||
     Object.keys(params).some(k=>!allowed.includes(k)) ||
     required.some(k=>typeof params[k]!=="string" || !params[k].trim()))
   throw new TypeError("Invalid query");
  const token=await getIdToken();
  if(typeof token!=="string" || !token.trim())throw new Error("Login required");
  const query=new URLSearchParams();
  for(const key of allowed)if(params[key]!==undefined)query.set(key,params[key]);
  const response=await fetchImpl("/api/v47/"+resource+"?"+query.toString(),{
   method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},
   credentials:"same-origin",cache:"no-store"
  });
  if(!response?.ok)throw new Error("School data unavailable or access denied");
  const body=await response.json();
  if(!Array.isArray(body?.[resource]))throw new Error("Invalid server response");
  return body[resource];
 }
 return Object.freeze({
  readMarks:params=>request("marks",params),
  readAttendance:params=>request("attendance",params)
 });
}
