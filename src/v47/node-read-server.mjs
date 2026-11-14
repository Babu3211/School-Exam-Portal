/**
 * Isolated V47 Node HTTP server factory. Does not start listening on import,
 * initialize Firebase, change Hosting, or touch V46 production.
 * Deployment adapter must supply trusted Firebase Admin SDK instances.
 */
import {createServer} from "node:http";
import {createV47NodeReadHandler} from "./read-api-router.mjs";
export function createV47ReadServer({auth,firestore}) {
 const handler=createV47NodeReadHandler({auth,firestore});
 return createServer((request,response)=>{
  Promise.resolve(handler(request,response)).catch(()=>{
   if(!response.headersSent){
    response.statusCode=500;
    response.setHeader("Content-Type","application/json");
    response.setHeader("Cache-Control","no-store");
   }
   if(!response.writableEnded)response.end(JSON.stringify({error:"Internal server error"}));
  });
 });
}
