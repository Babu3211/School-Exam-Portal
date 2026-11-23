/**
 * V47 Node-only official marks publication final commit.
 * Critical fail-closed gate: disabled unless the server operator explicitly
 * sets publicationEnabled:true after independent release approval.
 * The Firebase Spark/browser hosting build does NOT deploy this endpoint.
 * No browser-supplied marks, roster, membership, or approval flags are trusted.
 */
import {createAdminClassPublicationReaders} from '../../v47/server-publication-authoritative-loader.mjs';
import {commitTrustedOfficialClassPublication} from '../../v47/server-official-publication-commit.mjs';
const school=/^[0-9]{5,20}$/,segment=/^[A-Za-z0-9_-]{1,128}$/;
const classes=new Set(['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]);
const terms=new Set(['weekly','monthly','1st','2nd','3rd','final']);
const publicationIdPattern=/^[A-Za-z0-9_-]{8,128}$/;
function validScope(s){
 return s&&typeof s==='object'&&!Array.isArray(s)&&
  Object.keys(s).sort().join(',')==='classId,examId,schoolId,subjectId'&&
  school.test(s.schoolId)&&classes.has(s.classId)&&segment.test(s.subjectId)&&terms.has(s.examId);
}
function validRequest(b){
 return b&&typeof b==='object'&&!Array.isArray(b)&&
  Object.keys(b).sort().join(',')==='confirmPublish,confirmation,expectedPreviousId,publicationId,scope'&&
  b.confirmPublish==='PUBLISH OFFICIAL MARKS'&&validScope(b.scope)&&
  typeof b.publicationId==='string'&&publicationIdPattern.test(b.publicationId)&&
  (b.expectedPreviousId===null||
   typeof b.expectedPreviousId==='string'&&publicationIdPattern.test(b.expectedPreviousId));
}
export function createV47NodePublicationCommitHandler({
 auth,firestore,publicationEnabled=false
}){
 if(typeof auth?.verifyIdToken!=='function'||typeof firestore?.doc!=='function'||
    typeof firestore?.collection!=='function'||typeof firestore?.runTransaction!=='function')
  throw new TypeError('Trusted Firebase Admin SDK required');
 return async function handle(req,res){
  const respond=(status,body)=>{
   if(res.writableEnded)return;
   res.statusCode=status;
   res.setHeader('Content-Type','application/json; charset=utf-8');
   res.setHeader('Cache-Control','no-store');
   res.setHeader('X-Content-Type-Options','nosniff');
   res.end(JSON.stringify(body));
  };
  if(req.url!=='/api/v47/publication/commit')return respond(404,{error:'Not found'});
  if(req.method!=='POST')return respond(405,{error:'Method not allowed'});
  // Safe even with production credentials: default server cannot publish.
  if(publicationEnabled!==true)
   return respond(503,{error:'Official publication disabled until audited release approval'});
  const token=/^Bearer ([^\s]+)$/.exec(String(req.headers?.authorization||''))?.[1];
  if(!token)return respond(401,{error:'Authentication required'});
  if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type']||'')))
   return respond(415,{error:'JSON required'});
  const chunks=[];let size=0;
  try{
   for await(const chunk of req){
    size+=Buffer.byteLength(chunk);
    if(size>4096)return respond(413,{error:'Publication payload too large'});
    chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
   }
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(!validRequest(body))return respond(400,{error:'Explicit official publish confirmation required'});
   const decoded=await auth.verifyIdToken(token,true);
   if(typeof decoded?.uid!=='string'||!segment.test(decoded.uid)||
      decoded.firebase?.sign_in_provider==='anonymous')
    throw new Error('Authenticated School Admin required');
   const actorUid=decoded.uid;
   const readers=createAdminClassPublicationReaders({firestore,...body.scope,actorUid});
   // Trusted existing commit re-reads authoritative drafts, settings,
   // membership, staged manifest, pages and expected old pointer. Its ONE
   // Admin SDK transaction atomically writes pointer, header and audit.
   const result=await commitTrustedOfficialClassPublication({
    ...readers,publicationId:body.publicationId,
    expectedPreviousId:body.expectedPreviousId,
    confirmation:body.confirmation
   });
   if(result.committed!==true||result.publicationId!==body.publicationId)
    throw Error('Publication outcome not verified');
   return respond(200,{result,officialPublished:true,cdcGradeApproved:false,
    warning:'Marks pointer committed. CDC/IEMIS Grade Sheet approval is separate.'});
  }catch{
   return respond(403,{error:'Access denied, stale confirmation or concurrent publication'});
  }
 };
}
