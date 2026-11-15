/**
 * Isolated V47 trusted platform-admin onboarding API.
 * Requires Firebase ID token and active platform_admins membership.
 * No production auto-mount or account/password creation.
 */
import {registerSchoolFromVerifiedToken,inviteSchoolAdminFromVerifiedToken} from "./trusted-onboarding-service.mjs";
const ROUTES=new Map([
 ["/api/v47/platform/schools/register","register"],
 ["/api/v47/platform/schools/invite-admin","invite"]
]);
export function createV47NodeOnboardingHandler({auth,firestore}) {
 if(typeof auth?.verifyIdToken!=="function" || typeof firestore?.runTransaction!=="function")
  throw new TypeError("Trusted Firebase Admin SDK required");
 return async function handle(req,res) {
  const respond=(status,body)=>{
   if(res.writableEnded)return;
   res.statusCode=status;
   res.setHeader("Content-Type","application/json; charset=utf-8");
   res.setHeader("Cache-Control","no-store");
   res.setHeader("X-Content-Type-Options","nosniff");
   res.end(JSON.stringify(body));
  };
  const action=ROUTES.get(req.url);
  if(!action)return respond(404,{error:"Not found"});
  if(req.method!=="POST")return respond(405,{error:"Method not allowed"});
  const match=/^Bearer ([^\\s]+)$/.exec(String(req.headers?.authorization||""));
  if(!match)return respond(401,{error:"Authentication required"});
  if(!/^application\\/json(?:\\s*;|$)/i.test(String(req.headers?.["content-type"]||"")))
   return respond(415,{error:"JSON required"});
  const chunks=[];
  let size=0;
  try {
   for await(const chunk of req){
    size+=Buffer.byteLength(chunk);
    if(size>16384)return respond(413,{error:"Request too large"});
    chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
   }
   const body=JSON.parse(Buffer.concat(chunks).toString("utf8"));
   if(!body || typeof body!=="object" || Array.isArray(body))return respond(400,{error:"Invalid request"});
   if(action==="register"){
    if(Object.keys(body).some(k=>k!=="input") || !body.input || typeof body.input!=="object" || Array.isArray(body.input))
     return respond(400,{error:"Invalid registration request"});
    const result=await registerSchoolFromVerifiedToken({idToken:match[1],input:body.input,auth,firestore});
    return respond(201,{result});
   }
   if(Object.keys(body).some(k=>!["schoolId","adminEmail"].includes(k)) ||
      typeof body.schoolId!=="string" || typeof body.adminEmail!=="string")
    return respond(400,{error:"Invalid invitation request"});
   const result=await inviteSchoolAdminFromVerifiedToken({idToken:match[1],schoolId:body.schoolId,adminEmail:body.adminEmail,auth,firestore});
   return respond(201,{result});
  }catch {
   return respond(403,{error:"Access denied or invalid onboarding request"});
  }
 };
}
