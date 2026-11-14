/**
 * V47 isolated API server: routes both verified read endpoints and student writes.
 * Factory only; importing never starts a listener or touches V46 production.
 */
import {createServer} from "node:http";
import {createV47NodeReadHandler} from "./read-api-router.mjs";
import {createV47NodeStudentWriteHandler} from "./node-student-write-handler.mjs";
export function createV47ApiServer({auth,firestore}) {
 const read=createV47NodeReadHandler({auth,firestore});
 const write=createV47NodeStudentWriteHandler({auth,firestore});
 return createServer((request,response)=>{
  const task=request.url==="/api/v47/students/write"
   ? write(request,response):read(request,response);
  Promise.resolve(task).catch(()=>{
   if(!response.headersSent){
    response.statusCode=500;
    response.setHeader("Content-Type","application/json; charset=utf-8");
    response.setHeader("Cache-Control","no-store");
   }
   if(!response.writableEnded)response.end(JSON.stringify({error:"Internal server error"}));
  });
 });
}
