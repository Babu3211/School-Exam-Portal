/** Authenticated, read-only V47 school selection endpoint. */
import {listVerifiedUserSchools} from "./verified-school-list.mjs";
export function createV47SchoolsHttpHandler({auth,firestore}) {
 return async function handle(request) {
  if(request?.method!=="GET")return {status:405,body:{error:"Method not allowed"}};
  if(request.query && Object.keys(request.query).length)
   return {status:400,body:{error:"Invalid query"}};
  const bearer=request?.headers?.authorization??request?.headers?.Authorization;
  const match=typeof bearer==="string"?/^Bearer ([^\s]+)$/.exec(bearer):null;
  if(!match)return {status:401,body:{error:"Authentication required"}};
  try {return {status:200,body:{schools:await listVerifiedUserSchools({idToken:match[1],auth,firestore})}};}
  catch {return {status:403,body:{error:"Access denied"}};}
 };
}
