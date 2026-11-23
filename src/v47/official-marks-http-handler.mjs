/** Read-only official V47 marks endpoint on the ISOLATED Node server.
 * Uses Firebase Admin Auth and a single Admin Firestore read transaction.
 * Returns committed component marks only, never drafts, CDC grades or
 * unverified Grade Sheets. No browser role or UID is trusted.
 */
import {loadCommittedOfficialClassMarks} from '../../v47/server-official-marks-firestore-loader.mjs';

const schoolIdPattern=/^[0-9]{5,20}$/;
const segment=/^[A-Za-z0-9_-]{1,128}$/;
const classes=new Set(['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]);
const terms=new Set(['weekly','monthly','1st','2nd','3rd','final']);
const required=['classId','examId','schoolId','subjectId'];
function validQuery(q){
 if(!q||typeof q!=='object'||Array.isArray(q)||Object.keys(q).sort().join(',')!==required.join(','))return false;
 return schoolIdPattern.test(q.schoolId)&&classes.has(q.classId)&&segment.test(q.subjectId)&&terms.has(q.examId);
}
export function createV47OfficialMarksHttpHandler({auth,firestore}){
 if(typeof auth?.verifyIdToken!=='function'||typeof firestore?.doc!=='function'||typeof firestore?.runTransaction!=='function')
  throw new TypeError('Trusted Firebase Admin Auth and Firestore required');
 return async function handle(req){
  if(req?.method!=='GET')return {status:405,body:{error:'Method not allowed'}};
  const authHeader=req?.headers?.authorization??req?.headers?.Authorization;
  const token=typeof authHeader==='string'?/^Bearer ([^\s]+)$/.exec(authHeader)?.[1]:null;
  if(!token)return {status:401,body:{error:'Authentication required'}};
  if(!validQuery(req.query))return {status:400,body:{error:'Invalid official marks query'}};
  try{
   const decoded=await auth.verifyIdToken(token,true);
   if(typeof decoded?.uid!=='string'||!segment.test(decoded.uid)||
      decoded.firebase?.sign_in_provider==='anonymous')
    throw new Error('Authenticated user required');
   const {schoolId,classId,subjectId,examId}=req.query;
   const result=await loadCommittedOfficialClassMarks({
    firestore,schoolId,classId,subjectId,examId,actorUid:decoded.uid
   });
   return {status:200,body:{result,officialComponentMarksOnly:true,cdcGradeApproved:false}};
  }catch{
   return {status:403,body:{error:'Access denied or official result unavailable'}};
  }
 };
}
