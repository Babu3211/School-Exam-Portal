/**
 * Framework-neutral HTTP handler for V47 school marks reads.
 * Intended for a future authenticated server deployment, not V46 hosting.
 * Never accepts a UID or roles from the request body/query.
 */
import {validateV47ReadQuery} from "./read-query-validation.mjs";
import {readVerifiedV46SchoolMarks} from "./verified-v46-marks-reader.mjs";
import {createAdminFirestoreReadGateway} from "./admin-firestore-read-gateway.mjs";

export function createV47MarksHttpHandler({auth,firestore}) {
 if(!auth || typeof auth.verifyIdToken!=="function" ||
    !firestore || typeof firestore.doc!=="function" || typeof firestore.collection!=="function")
  throw new TypeError("Firebase Admin SDK required");
 const gateway=createAdminFirestoreReadGateway(firestore);
 return async function handle(request) {
  if(request?.method!=="GET") return {status:405,body:{error:"Method not allowed"}};
  const header=request?.headers?.authorization ?? request?.headers?.Authorization;
  const match=typeof header==="string" ? /^Bearer ([^\s]+)$/.exec(header) : null;
  if(!match) return {status:401,body:{error:"Authentication required"}};
  const params=request?.query;
  if(!validateV47ReadQuery(params,"marks"))
   return {status:400,body:{error:"Invalid query"}};
  try {
   const rows=await readVerifiedV46SchoolMarks({
    idToken:match[1],schoolId:params.schoolId,className:params.className,
    subject:params.subject,section:params.section??"",auth,firestore,gateway
   });
   return {status:200,body:{marks:rows}};
  } catch(error) {
   // No internal Firebase, tenant, or token errors exposed to callers.
   return {status:403,body:{error:"Access denied or invalid query"}};
  }
 };
}
