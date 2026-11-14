/**
 * Isolated V47 Node POST adapter. No auto-listen, no production side effects.
 * Enforces a strict 16 KiB body cap and single known route.
 */
import {createV47StudentWriteHttpHandler} from "./student-write-http-handler.mjs";
export function createV47NodeStudentWriteHandler({auth,firestore}) {
 const write=createV47StudentWriteHttpHandler({auth,firestore});
 return async function handle(req,res) {
  const respond=(status,body)=>{
   res.statusCode=status;
   res.setHeader("Content-Type","application/json; charset=utf-8");
   res.setHeader("Cache-Control","no-store");
   res.setHeader("X-Content-Type-Options","nosniff");
   res.end(JSON.stringify(body));
  };
  if(req.url!=="/api/v47/students/write")return respond(404,{error:"Not found"});
  if(req.method!=="POST")return respond(405,{error:"Method not allowed"});
  if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.["content-type"]||"")))
   return respond(415,{error:"JSON required"});
  let size=0;
  const chunks=[];
  try {
   for await(const chunk of req) {
    size+=Buffer.byteLength(chunk);
    if(size>16384)return respond(413,{error:"Request too large"});
    chunks.push(chunk);
   }
   // Decode once: UTF-8 Nepali characters may span HTTP chunk boundaries.
   const data=JSON.parse(Buffer.concat(chunks).toString("utf8"));
   const result=await write({method:"POST",headers:req.headers,body:data});
   return respond(result.status,result.body);
  }catch {return respond(400,{error:"Invalid JSON request"});}
 };
}
