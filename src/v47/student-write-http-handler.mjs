/** Authenticated student create/update endpoint, never directly deployed to V46. */
import {writeVerifiedStudent} from "./verified-student-writer.mjs";
export function createV47StudentWriteHttpHandler({auth,firestore}) {
 if(typeof auth?.verifyIdToken!=="function" || typeof firestore?.runTransaction!=="function")
  throw new TypeError("Firebase Admin SDK required");
 return async function handle(request) {
  if(request?.method!=="POST")return {status:405,body:{error:"Method not allowed"}};
  const header=request?.headers?.authorization ?? request?.headers?.Authorization;
  const match=typeof header==="string"?/^Bearer ([^\s]+)$/.exec(header):null;
  if(!match)return {status:401,body:{error:"Authentication required"}};
  const body=request?.body;
  if(!body || typeof body!=="object" || Array.isArray(body) ||
   Object.keys(body).some(key=>!["schoolId","studentId","mode","values"].includes(key)))
   return {status:400,body:{error:"Invalid request"}};
  try {
   const result=await writeVerifiedStudent({idToken:match[1],schoolId:body.schoolId,
    studentId:body.studentId,mode:body.mode,values:body.values,auth,firestore});
   return {status:200,body:{result}};
  }catch {return {status:403,body:{error:"Access denied or invalid student data"}};}
 };
}
