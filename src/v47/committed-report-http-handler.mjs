// Isolated trusted-server report preview endpoint. No writes or official CDC approval.
import {loadCommittedIemisReportSnapshot} from '../../v47/server-official-marks-firestore-loader.mjs';
export function createV47CommittedReportHttpHandler({auth,firestore}){
 if(typeof auth?.verifyIdToken!=='function')throw TypeError('Firebase Admin Auth required');
 return async req=>{
  if(req?.method!=='GET')return {status:405,body:{error:'Method not allowed'}};
  const header=req.headers?.authorization??req.headers?.Authorization;
  const token=typeof header==='string'?/^Bearer ([^\s]+)$/.exec(header)?.[1]:null;
  if(!token)return {status:401,body:{error:'Authentication required'}};
  const q=req.query;
  if(!q||Object.keys(q).sort().join(',')!=='classId,examId,schoolId'||
    typeof q.schoolId!=='string'||!/^\d{5,20}$/.test(q.schoolId)||
    typeof q.classId!=='string'||!/^(?:[1-9]|10)$/.test(q.classId)||
    !['1st','2nd','3rd','final'].includes(q.examId))
   return {status:400,body:{error:'Invalid report query'}};
  try{
   const user=await auth.verifyIdToken(token,true);
   if(typeof user?.uid!=='string'||!user.uid||user.firebase?.sign_in_provider==='anonymous')throw Error('Verified sign-in required');
   const snapshot=await loadCommittedIemisReportSnapshot({firestore,...q,actorUid:user.uid});
   return {status:200,body:{snapshot,previewOnly:true,cdcGradeApproved:false}};
  }catch{return {status:403,body:{error:'Access denied or complete committed report unavailable'}}}
 };
}
