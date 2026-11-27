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

// On demand only: fixed five-class counts of historical source records, not
// unique pupils, draft completion, or official results. No student data reads.
export async function loadPrimaryAssessmentClassCounts({schoolId,uid,role,readDocument,readCount,assertSession}){
 if(role!=='school_admin'||typeof readDocument!=='function'||typeof readCount!=='function'||typeof assertSession!=='function')throw Error('School Admin required');
 const check=async()=>{assertSession();const s=await verifySchoolSession({schoolId,uid,readDocument});assertSession();if(s.role!==role)throw Error('Assessment role changed')};
 await check();
 const rows=[];
 for(const grade of ['1','2','3','4','5']){
  const ne='०१२३४५६७८९'[Number(grade)],classNames=[grade,ne,'Class '+grade,'class '+grade,'Class'+grade,'class'+grade,'कक्षा '+grade,'कक्षा '+ne,'कक्षा'+grade,'कक्षा'+ne];
  const count=async name=>{assertSession();const n=await readCount(name,{schoolId,academicYear:'2083',classNames});assertSession();if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid assessment count');return n};
  const [observations,indicatorBlocks]=await Promise.all(['cdc_observations','cdc_serofero_indicators'].map(count));
  rows.push(Object.freeze({grade,observations,indicatorBlocks}));
 }
 await check();
 return Object.freeze({schoolId,academicYear:'2083',rows:Object.freeze(rows),readOnly:true,officialAssessmentApproved:false});
}
