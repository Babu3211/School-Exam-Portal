// Count migrated assessment records, not assessed students or official grades.
import {verifySchoolSession} from './verified-school-session.mjs';
export async function loadPrimaryAssessmentCounts({schoolId,uid,role,readDocument,readCount,assertSession}){
 if(role!=='school_admin'||typeof readDocument!=='function'||typeof readCount!=='function'||typeof assertSession!=='function')throw Error('School Admin required');
 const check=async()=>{assertSession();const session=await verifySchoolSession({schoolId,uid,readDocument});assertSession();if(session.role!==role)throw Error('Assessment role changed')};
 await check();
 const counts=await Promise.all(['cdc_observations','cdc_serofero_indicators'].map(async name=>{
  assertSession();
  const count=await readCount(name,{schoolId,academicYear:'2083'});
  assertSession();
  if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid assessment count');
  return count;
 }));
 await check();
 return Object.freeze({schoolId,academicYear:'2083',observations:counts[0],indicatorBlocks:counts[1],readOnly:true,officialAssessmentApproved:false});
}
