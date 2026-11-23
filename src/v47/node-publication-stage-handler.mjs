/**
 * V47 isolated Node-only POST /api/v47/publication/stage.
 * Stage complete-class pages ONLY; it cannot write official pointers, grade
 * sheets, or raw per-student marks. No public hosting/server is deployed.
 * Client supplies a bounded review confirmation, never class data or a UID.
 */
import {randomUUID} from 'node:crypto';
import {createAdminClassPublicationReaders} from '../../v47/server-publication-authoritative-loader.mjs';
import {stageTrustedClassMarks} from '../../v47/server-publication-staging-executor.mjs';
import {verifyClassReviewConfirmation} from '../../v47/server-class-review-confirmation.mjs';
const idPattern=/^[A-Za-z0-9_-]{1,128}$/;
const schoolPattern=/^[0-9]{5,20}$/;
const classes=new Set(['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]);
const terms=new Set(['weekly','monthly','1st','2nd','3rd','final']);
function safeScope(o){
 return o&&typeof o==='object'&&!Array.isArray(o)&&
  Object.keys(o).sort().join(',')==='classId,examId,schoolId,subjectId'&&
  schoolPattern.test(o.schoolId)&&classes.has(o.classId)&&
  idPattern.test(o.subjectId)&&terms.has(o.examId);
}
export function createV47NodePublicationStageHandler({auth,firestore}){
 if(typeof auth?.verifyIdToken!=='function'||typeof firestore?.doc!=='function'||
    typeof firestore?.collection!=='function'||typeof firestore?.runTransaction!=='function')
  throw new TypeError('Trusted Firebase Admin Auth and Firestore required');
 return async function handle(req,res){
  const respond=(status,body)=>{
   if(res.writableEnded)return;
   res.statusCode=status;
   res.setHeader('Content-Type','application/json; charset=utf-8');
   res.setHeader('Cache-Control','no-store');
   res.setHeader('X-Content-Type-Options','nosniff');
   res.end(JSON.stringify(body));
  };
  if(req.url!=='/api/v47/publication/stage')return respond(404,{error:'Not found'});
  if(req.method!=='POST')return respond(405,{error:'Method not allowed'});
  const token=/^Bearer ([^\s]+)$/.exec(String(req.headers?.authorization||''))?.[1];
  if(!token)return respond(401,{error:'Authentication required'});
  if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type']||'')))
   return respond(415,{error:'JSON required'});
  let bytes=0;
  const chunks=[];
  try{
   for await(const chunk of req){
    bytes+=Buffer.byteLength(chunk);
    if(bytes>4096)return respond(413,{error:'Review payload too large'});
    chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
   }
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(!body||typeof body!=='object'||Array.isArray(body)||
      Object.keys(body).sort().join(',')!=='confirmStage,confirmation,scope'||
      body.confirmStage!==true||!safeScope(body.scope))
    return respond(400,{error:'Explicit full-class staging consent and scope required'});
   const decoded=await auth.verifyIdToken(token,true);
   if(typeof decoded?.uid!=='string'||!idPattern.test(decoded.uid)||
      decoded.firebase?.sign_in_provider==='anonymous')
    throw Error('Verified School Admin required');
   const actorUid=decoded.uid,scope=body.scope;
   const readers=createAdminClassPublicationReaders({firestore,...scope,actorUid});
   // Read a consistent starting school, membership, subject, settings, roster
   // and draft. Reject any stale, forged or cross-school confirmation BEFORE
   // writing even the first staged page.
   await firestore.runTransaction(async transaction=>{
    const input=await readers.loadTransactionalAuthoritative({
     ...scope,uid:actorUid,transaction
    });
    verifyClassReviewConfirmation({confirmation:body.confirmation,authoritativeInput:input});
   });
   const loadAuthoritative=async args=>{
    const input=await readers.loadAuthoritative(args);
    // Re-check every source read across the 100-row staging pages. A revision
    // change must never create the 'verified' manifest for stale confirmation.
    verifyClassReviewConfirmation({confirmation:body.confirmation,authoritativeInput:input});
    return input;
   };
   // Server-generated unpredictable ID, never supplied by the browser.
   // Staging may leave inert orphan pages if interrupted, but cannot publish.
   const publicationId='pub_'+randomUUID().replaceAll('-','');
   const stage=await stageTrustedClassMarks({
    ...readers,loadAuthoritative,publicationId
   });
   if(stage.digest!==body.confirmation.digest||stage.publicationId!==publicationId||
      stage.publicationAllowed!==false||stage.writeAuthorized!==false)
    throw Error('Staged review changed; official publication forbidden');
   return respond(202,{stage,officialPublished:false,gradeSheetApproved:false,
    warning:'STAGED ONLY. Official marks publication remains disabled.'});
  }catch{
   return respond(403,{error:'Access denied, stale review or staging unavailable'});
  }
 };
}
