/**
 * V47 isolated API server: routes both verified read endpoints and student writes.
 * Factory only; importing never starts a listener or touches V46 production.
 */
import {createServer} from "node:http";
import {createV47NodeReadHandler} from "./read-api-router.mjs";
import {createV47NodeStudentWriteHandler} from "./node-student-write-handler.mjs";
import {createV47NodeOnboardingHandler} from "./node-onboarding-handler.mjs";
import {createV47NodeTeacherAssignmentHandler} from "./node-teacher-assignment-handler.mjs";
import {createV47NodePublicationStageHandler} from "./node-publication-stage-handler.mjs";
import {createV47NodePublicationCommitHandler} from "./node-publication-commit-handler.mjs";
import {createV47NodeAtomicAttendanceHandler} from "./node-atomic-attendance-handler.mjs";
export function createV47ApiServer({auth,firestore,publicationEnabled=false,atomicAttendanceEnabled=false,staticHandler=null}) {
 const atomicAttendance=createV47NodeAtomicAttendanceHandler({auth,firestore,atomicAttendanceEnabled});
 const read=createV47NodeReadHandler({auth,firestore});
 const write=createV47NodeStudentWriteHandler({auth,firestore});
 const onboard=createV47NodeOnboardingHandler({auth,firestore});
 const assignTeacher=createV47NodeTeacherAssignmentHandler({auth,firestore});
 // Legacy isolated-read test adapters omit Admin SDK transactions. Instantiate
 // this write-capable staging handler only when its explicit route is called.
 const stage=(req,res)=>{
  // A disabled final commit must not leave additional orphan staging pages or
  // consume shared Spark writes. Read-only review remains available.
  if(publicationEnabled!==true){
   res.statusCode=req.method==="POST"?503:405;
   res.setHeader("Content-Type","application/json; charset=utf-8");
   res.setHeader("Cache-Control","no-store");
   res.setHeader("X-Content-Type-Options","nosniff");
   res.end(JSON.stringify({error:req.method==="POST"?"Official publication disabled until audited release approval":"Method not allowed"}));
   return;
  }
  return createV47NodePublicationStageHandler({auth,firestore})(req,res);
 };
 // Final commit is disabled unless the explicitly configured trusted server
 // opts in; the browser, static Hosting and existing runtimes cannot enable it.
 const publish=(req,res)=>createV47NodePublicationCommitHandler({
  auth,firestore,publicationEnabled
 })(req,res);
 return createServer((request,response)=>{
  const task=typeof staticHandler==='function'&&typeof request.url==='string'&&
    !request.url.startsWith('/api/')&&request.url!=='/api'
   ? staticHandler(request,response)
   : request.url==="/api/v47/attendance/atomic"
   ? atomicAttendance(request,response)
   : request.url==="/api/v47/publication/commit"
   ? publish(request,response)
   : request.url==="/api/v47/publication/stage"
   ? stage(request,response)
   : request.url==="/api/v47/teachers/assign"
   ? assignTeacher(request,response)
   : request.url==="/api/v47/students/write"
   ? write(request,response)
   : request.url?.startsWith("/api/v47/platform/schools/")
    ? onboard(request,response):read(request,response);
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
