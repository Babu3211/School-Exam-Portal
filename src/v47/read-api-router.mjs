/**
 * Isolated V47 read API router. No server startup, deployment, or V46 mutation.
 * Adapters pass an already verified Firebase Admin Auth and Firestore instance.
 */
import {createV47DashboardHttpHandler} from "./dashboard-http-handler.mjs";
import {createV47MarksHttpHandler} from "./marks-http-handler.mjs";
import {createV47AttendanceHttpHandler} from "./attendance-http-handler.mjs";
export function createV47ReadApiRouter({auth,firestore}) {
 const handlers=new Map([
  ["/api/v47/dashboard",createV47DashboardHttpHandler({auth,firestore})],
  ["/api/v47/marks",createV47MarksHttpHandler({auth,firestore})],
  ["/api/v47/attendance",createV47AttendanceHttpHandler({auth,firestore})]
 ]);
 return async function route(request) {
  const rawPath=request?.path;
  if(typeof rawPath!=="string" || !handlers.has(rawPath))
   return {status:404,body:{error:"Not found"}};
  return handlers.get(rawPath)(request);
 };
}
/** Node HTTP adapter, with strict request-size and method boundaries. */
export function createV47NodeReadHandler({auth,firestore}) {
 const route=createV47ReadApiRouter({auth,firestore});
 return async function handle(req,res) {
  const respond=(status,body)=>{
   res.statusCode=status;
   res.setHeader("Content-Type","application/json; charset=utf-8");
   res.setHeader("Cache-Control","no-store");
   res.setHeader("X-Content-Type-Options","nosniff");
   res.end(JSON.stringify(body));
  };
  try {
   if(typeof req.url!=="string" || req.url.length>2048)return respond(414,{error:"Invalid URL"});
   const url=new URL(req.url,"http://localhost");
   if(!url.pathname.startsWith("/api/v47/"))return respond(404,{error:"Not found"});
   if(req.method!=="GET")return respond(405,{error:"Method not allowed"});
   const query=Object.fromEntries(url.searchParams);
   if([...url.searchParams.keys()].length!==Object.keys(query).length)
    return respond(400,{error:"Duplicate query parameters"});
   const response=await route({path:url.pathname,method:req.method,query,headers:req.headers});
   respond(response.status,response.body);
  }catch {respond(500,{error:"Internal server error"});}
 };
}
