import {reviewOrSaveAtomicClassAttendance} from '../../v47/server-atomic-class-attendance.mjs';
export function createV47NodeAtomicAttendanceHandler({auth,firestore,atomicAttendanceEnabled=false}){
 return async(req,res)=>{
  const send=(status,body)=>{if(res.writableEnded)return;res.statusCode=status;
   res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
   res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body))};
  if(req.url!=='/api/v47/attendance/atomic')return send(404,{error:'Not found'});
  if(req.method!=='POST')return send(405,{error:'Method not allowed'});
  if(atomicAttendanceEnabled!==true)return send(503,{error:'Atomic attendance server disabled pending release verification'});
  const token=/^Bearer ([^\s]+)$/.exec(String(req.headers?.authorization??''))?.[1];
  if(!token)return send(401,{error:'Authentication required'});
  if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type']??'')))return send(415,{error:'JSON required'});
  try{
   const chunks=[];let bytes=0;
   for await(const chunk of req){bytes+=Buffer.byteLength(chunk);if(bytes>160000)return send(413,{error:'Attendance request too large'});chunks.push(Buffer.from(chunk))}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return send(400,{error:'Invalid JSON'})}
   if(!body||Object.keys(body).sort().join(',')!=='classId,date,entries,reviewDigest,schoolId'||
      !Array.isArray(body.entries)||body.entries.length>500)return send(400,{error:'Invalid atomic attendance request'});
   const decoded=await auth.verifyIdToken(token,true);
   if(typeof decoded?.uid!=='string'||decoded.firebase?.sign_in_provider==='anonymous')throw Error('Verified login required');
   const result=await reviewOrSaveAtomicClassAttendance({firestore,...body,actorUid:decoded.uid});
   return send(200,{result});
  }catch{return send(403,{error:'Attendance unavailable, access denied, or review changed. Reload and verify before retrying.'})}
 };
}
