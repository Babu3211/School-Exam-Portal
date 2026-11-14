/** Authenticated, bounded, read-only V46-compatible school records endpoint. */
import {readVerifiedV46Records} from "./verified-v46-records-reader.mjs";
export function createV47RecordsHttpHandler({auth,firestore}) {
 if(typeof auth?.verifyIdToken!=="function" || typeof firestore?.doc!=="function" || typeof firestore?.collection!=="function")
  throw new TypeError("Firebase Admin SDK required");
 return async function handle(request) {
  if(request?.method!=="GET")return {status:405,body:{error:"Method not allowed"}};
  const header=request?.headers?.authorization ?? request?.headers?.Authorization;
  const match=typeof header==="string"?/^Bearer ([^\s]+)$/.exec(header):null;
  if(!match)return {status:401,body:{error:"Authentication required"}};
  const params=request?.query;
  if(!params || typeof params!=="object" || Array.isArray(params) ||
    Object.keys(params).some(key=>!["schoolId","collection","limit"].includes(key)) ||
    typeof params.schoolId!=="string" || typeof params.collection!=="string" ||
    !/^[A-Za-z0-9_-]{8,64}$/.test(params.schoolId) ||
    (params.limit!==undefined && !/^(?:[1-9]\d{0,2})$/.test(params.limit)))
   return {status:400,body:{error:"Invalid query"}};
  const maxRows=params.limit===undefined?100:Number(params.limit);
  if(maxRows>500)return {status:400,body:{error:"Invalid query"}};
  try {
   const records=await readVerifiedV46Records({idToken:match[1],schoolId:params.schoolId,
    collection:params.collection,maxRows,auth,firestore});
   return {status:200,body:{records}};
  }catch {return {status:403,body:{error:"Access denied or invalid query"}};}
 };
}
