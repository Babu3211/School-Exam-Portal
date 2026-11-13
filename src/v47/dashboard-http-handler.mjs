/** Read-only selected school dashboard HTTP contract. Not deployed. */
import {loadVerifiedSchoolDashboard} from "./verified-school-dashboard.mjs";
export function createV47DashboardHttpHandler({auth,firestore}) {
 if(!auth || typeof auth.verifyIdToken!=="function" || !firestore || typeof firestore.doc!=="function")
  throw new TypeError("Firebase Admin SDK required");
 return async function handle(request) {
  if(request?.method!=="GET")return {status:405,body:{error:"Method not allowed"}};
  const header=request?.headers?.authorization ?? request?.headers?.Authorization;
  const match=typeof header==="string"?/^Bearer ([^\s]+)$/.exec(header):null;
  if(!match)return {status:401,body:{error:"Authentication required"}};
  const params=request?.query;
  if(!params || typeof params!=="object" || Array.isArray(params) ||
     Object.keys(params).length!==1 || typeof params.schoolId!=="string" ||
     !/^[A-Za-z0-9_-]{8,64}$/.test(params.schoolId))
   return {status:400,body:{error:"Invalid query"}};
  try {
   const dashboard=await loadVerifiedSchoolDashboard({
    idToken:match[1],schoolId:params.schoolId,auth,firestore
   });
   return {status:200,body:{dashboard}};
  }catch {
   return {status:403,body:{error:"Access denied"}};
  }
 };
}
