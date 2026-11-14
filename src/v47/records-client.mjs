/** Read-only school records browser client. Server always verifies membership. */
import {assertSchoolId} from "./tenant-domain.mjs";
const ALLOWED=new Set(["students","staff","classes","exams","mark_settings","marks","attendance","certificates","school_settings","subjects"]);
export function createV47RecordsClient({getIdToken,fetchImpl}) {
 if(typeof getIdToken!=="function" || typeof fetchImpl!=="function")throw new TypeError("Token provider and fetch required");
 return Object.freeze({async readRecords({schoolId,collection,limit=100}){
  assertSchoolId(schoolId);
  if(!ALLOWED.has(collection))throw new Error("Unsupported private collection");
  if(!Number.isSafeInteger(limit)||limit<1||limit>500)throw new TypeError("Invalid limit");
  const token=await getIdToken();
  if(typeof token!=="string" || !token.trim())throw new Error("Login required");
  const url="/api/v47/records?"+new URLSearchParams({schoolId,collection,limit:String(limit)});
  const response=await fetchImpl(url,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},credentials:"same-origin",cache:"no-store"});
  if(!response?.ok)throw new Error("Records unavailable or access denied");
  const payload=await response.json();
  if(!Array.isArray(payload?.records)||payload.records.length>limit)throw new Error("Invalid records response");
  return payload.records;
 }});
}
