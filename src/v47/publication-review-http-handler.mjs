/** Secure READ-ONLY Class Marks Publication Review for isolated V47 Node server.
 * Only an active School Admin, verified with Firebase Auth + authoritative
 * school/membership/student/draft/settings reads, may obtain a review digest.
 * Does not accept client marks, does not stage/commit, and is not deployed.
 */
import {createAdminClassPublicationReaders} from '../../v47/server-publication-authoritative-loader.mjs';
import {officialClassPointerId} from '../../v47/server-publication-authoritative-preflight.mjs';
import {fingerprintConfiguredClassReview} from '../../v47/server-class-review-fingerprint.mjs';
const schools=/^[0-9]{5,20}$/,parts=/^[A-Za-z0-9_-]{1,128}$/;
const classes=new Set(['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]);
const terms=new Set(['weekly','monthly','1st','2nd','3rd','final']);
const fields=['classId','examId','schoolId','subjectId'].join(',');
function valid(q){
 return q&&typeof q==='object'&&!Array.isArray(q)&&
  Object.keys(q).sort().join(',')===fields&&
  schools.test(q.schoolId)&&classes.has(q.classId)&&
  parts.test(q.subjectId)&&terms.has(q.examId);
}
export function createV47PublicationReviewHttpHandler({auth,firestore}){
 if(typeof auth?.verifyIdToken!=='function'||typeof firestore?.doc!=='function'||
    typeof firestore?.collection!=='function'||typeof firestore?.runTransaction!=='function')
  throw new TypeError('Trusted Firebase Admin SDK required');
 return async function handle(request){
  if(request?.method!=='GET')return {status:405,body:{error:'Method not allowed'}};
  const header=request?.headers?.authorization??request?.headers?.Authorization;
  const token=typeof header==='string'?/^Bearer ([^\s]+)$/.exec(header)?.[1]:null;
  if(!token)return {status:401,body:{error:'Authentication required'}};
  if(!valid(request.query))return {status:400,body:{error:'Invalid class publication review query'}};
  try{
   const result=await auth.verifyIdToken(token,true);
   if(typeof result?.uid!=='string'||!parts.test(result.uid)||
      result.firebase?.sign_in_provider==='anonymous')
    throw new Error('Verified non-anonymous user required');
   const scope=request.query,actorUid=result.uid;
   const readers=createAdminClassPublicationReaders({firestore,...scope,actorUid});
   // School, membership, subject, examination settings, ALL class students
   // and stored complete-class draft are reloaded server-side, never supplied
   // by the caller. This endpoint has no write methods.
   // A single consistent Firestore transaction prevents a role revocation
   // or roster/settings edit between individual reads from creating a review
   // against a mixture of class revisions.
   const {review,previousPublicationId}=await firestore.runTransaction(async transaction=>{
    const authoritative=await readers.loadTransactionalAuthoritative({
     ...scope,schoolId:scope.schoolId,uid:actorUid,transaction
    });
    const snap=await transaction.get(firestore.doc('schools/'+scope.schoolId+'/official_marks_pointers/'+officialClassPointerId(scope)));
    const pointer=(typeof snap?.exists==='function'?snap.exists():snap?.exists===true)?snap.data():null;
    if(pointer&&(!/^[A-Za-z0-9_-]{8,128}$/.test(pointer.publicationId??'')||
      Object.entries(scope).some(([key,value])=>pointer[key]!==value)))
     throw Error('Invalid current publication pointer');
    return {review:fingerprintConfiguredClassReview(authoritative),previousPublicationId:pointer?.publicationId??null};
   });
   return {status:200,body:{
    review,previousPublicationId,
    readOnly:true,stageAuthorized:false,publishAuthorized:false,
    warning:'Review only. Official marks and Grade Sheets are NOT published.'
   }};
  }catch{
   return {status:403,body:{error:'Access denied or class review unavailable'}};
  }
 };
}
