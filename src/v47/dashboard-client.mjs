/**
 * V47 browser-side dashboard API client for future isolated V47 UI.
 * This does not touch V46 index.html or deploy a server endpoint.
 * Auth and access control MUST remain on the server.
 */
export function createV47DashboardClient({getIdToken,fetchImpl,endpoint="/api/v47/dashboard"}) {
 if(typeof getIdToken!=="function" || typeof fetchImpl!=="function")
  throw new TypeError("Token provider and fetch implementation required");
 if(typeof endpoint!=="string" || !/^\/[A-Za-z0-9/_-]+$/.test(endpoint))
  throw new TypeError("Same-origin endpoint path required");
 return Object.freeze({
  async loadSchool(schoolId) {
   if(typeof schoolId!=="string" || !/^[A-Za-z0-9_-]{8,64}$/.test(schoolId))
    throw new TypeError("Invalid school ID");
   const token=await getIdToken();
   if(typeof token!=="string" || !token.trim())throw new Error("Login required");
   const response=await fetchImpl(endpoint+"?schoolId="+encodeURIComponent(schoolId),{
    method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},
    credentials:"same-origin",cache:"no-store"
   });
   if(!response?.ok)throw new Error("School dashboard unavailable or access denied");
   const payload=await response.json();
   const dashboard=payload?.dashboard;
   if(!dashboard || dashboard.schoolId!==schoolId ||
      typeof dashboard.schoolName!=="string" || !Array.isArray(dashboard.roles) ||
      typeof dashboard.readOnly!=="boolean")
    throw new Error("Invalid dashboard response");
   return Object.freeze({
    schoolId:dashboard.schoolId,schoolName:dashboard.schoolName,
    roles:Object.freeze([...dashboard.roles]),readOnly:dashboard.readOnly
   });
  }
 });
}
