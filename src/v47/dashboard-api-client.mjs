/** Staging-only authenticated school dashboard data client; no Firebase project binding. */
export function createV47DashboardClient({getIdToken,fetchImpl=fetch,baseUrl=""}) {
 if(typeof getIdToken!=="function" || typeof fetchImpl!=="function")
  throw new TypeError("Token provider and fetch required");
 let generation=0, selectedSchoolId=null;
 const request=async (path,schoolId,version)=>{
  const token=await getIdToken();
  if(typeof token!=="string" || !token)throw new Error("Authentication required");
  const response=await fetchImpl(baseUrl+path,{headers:{Authorization:"Bearer "+token},cache:"no-store"});
  if(version!==generation)throw new Error("School selection changed");
  if(!response.ok)throw new Error("School data access denied");
  const data=await response.json();
  if(version!==generation)throw new Error("School selection changed");
  if(schoolId && data.dashboard?.schoolId!==schoolId)
   throw new Error("School identity mismatch");
  return data;
 };
 return Object.freeze({
  clear(){generation++;selectedSchoolId=null;},
  async schools(){
   const version=generation;
   const data=await request("/api/v47/schools",null,version);
   if(!Array.isArray(data.schools))throw new Error("Invalid school list");
   return data.schools;
  },
  async selectSchool(schoolId){
   generation++;
   selectedSchoolId=null;
   if(typeof schoolId!=="string" || !/^[A-Za-z0-9_-]{8,64}$/.test(schoolId))
    throw new TypeError("Invalid school ID");
   selectedSchoolId=schoolId;
   const version=generation;
   const data=await request("/api/v47/dashboard?schoolId="+encodeURIComponent(schoolId),schoolId,version);
   return data.dashboard;
  },
  get selectedSchoolId(){return selectedSchoolId;}
 });
}
