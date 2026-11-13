/**
 * Read-only V47 attendance endpoint contract.
 * No deployment or V46 integration is performed by this module.
 */
import {validateV47ReadQuery} from "./read-query-validation.mjs";
import {readVerifiedV46Attendance} from "./verified-v46-attendance-reader.mjs";
export function createV47AttendanceHttpHandler({auth,firestore}) {
 if(!auth || typeof auth.verifyIdToken!=="function" ||
    !firestore || typeof firestore.doc!=="function" || typeof firestore.collection!=="function")
  throw new TypeError("Firebase Admin SDK required");
 return async function handle(request) {
  if(request?.method!=="GET")return {status:405,body:{error:"Method not allowed"}};
  const header=request?.headers?.authorization ?? request?.headers?.Authorization;
  const match=typeof header==="string"?/^Bearer ([^\s]+)$/.exec(header):null;
  if(!match)return {status:401,body:{error:"Authentication required"}};
  const params=request?.query;
  if(!validateV47ReadQuery(params,"attendance"))
   return {status:400,body:{error:"Invalid query"}};
  try {
   const rows=await readVerifiedV46Attendance({
    idToken:match[1],schoolId:params.schoolId,className:params.className,
    date:params.date,attendanceType:params.attendanceType??"daily",auth,firestore
   });
   return {status:200,body:{attendance:rows}};
  }catch {
   return {status:403,body:{error:"Access denied or invalid query"}};
  }
 };
}
