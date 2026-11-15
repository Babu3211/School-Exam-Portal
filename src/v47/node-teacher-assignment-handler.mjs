/** V47 authenticated school-admin teacher assignment HTTP endpoint. */
import {loadVerifiedSchoolSession} from "./verified-school-session.mjs";
import {assignTeacherOnTrustedServer} from "./trusted-teacher-assignment.mjs";
export function createV47NodeTeacherAssignmentHandler({auth,firestore}) {
 if(typeof auth?.verifyIdToken!=="function" || typeof firestore?.runTransaction!=="function")
  throw new TypeError("Firebase Admin SDK required");
 return async function handle(req,res) {
  const respond=(status,body)=>{
   if(res.writableEnded)return;
   res.statusCode=status;
   res.setHeader("Content-Type","application/json; charset=utf-8");
   res.setHeader("Cache-Control","no-store");
   res.setHeader("X-Content-Type-Options","nosniff");
   res.end(JSON.stringify(body));
  };
  if(req.url!=="/api/v47/teachers/assign")return respond(404,{error:"Not found"});
  if(req.method!=="POST")return respond(405,{error:"Method not allowed"});
  const match=/^Bearer ([^\s]+)$/.exec(String(req.headers?.authorization||""));
  if(!match)return respond(401,{error:"Authentication required"});
  if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.["content-type"]||"")))
   return respond(415,{error:"JSON required"});
  let size=0;
  const chunks=[];
  try{
   for await(const chunk of req){
    size+=Buffer.byteLength(chunk);
    if(size>16384)return respond(413,{error:"Request too large"});
    chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
   }
   const body=JSON.parse(Buffer.concat(chunks).toString("utf8"));
   if(!body || typeof body!=="object" || Array.isArray(body) ||
      Object.keys(body).some(k=>k!=="input") ||
      !body.input || typeof body.input!=="object" || Array.isArray(body.input))
    return respond(400,{error:"Invalid assignment request"});
   const adminSession=await loadVerifiedSchoolSession({
    idToken:match[1],schoolId:body.input.schoolId,auth,firestore
   });
   const result=await assignTeacherOnTrustedServer({adminSession,input:body.input,firestore});
   return respond(200,{result});
  }catch{return respond(403,{error:"Access denied or invalid assignment"});}
 };
}
