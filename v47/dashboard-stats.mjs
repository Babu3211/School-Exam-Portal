// V47 read-only dashboard aggregates, scoped to an independently verified school.
// Active membership is NOT equivalent to users online or currently logged in.
import {verifySchoolSession} from './verified-school-session.mjs';
export const DASHBOARD_STATS_COLLECTIONS=Object.freeze(['students','staff','subjects','exams']);
export async function loadVerifiedSchoolStats({schoolId,uid,role,readDocument,readCount,assertSession}){
 if(typeof readDocument!=='function'||typeof readCount!=='function'||typeof assertSession!=='function')
  throw new TypeError('Verified school count readers and session check required');
 assertSession();
 const before=await verifySchoolSession({schoolId,uid,readDocument});
 assertSession();
 if(before.role!==role)throw new Error('School membership changed before statistics');
 const collections=[...DASHBOARD_STATS_COLLECTIONS];
 if(role==='school_admin')collections.push('members');
 const values=await Promise.all(collections.map(async name=>{
  assertSession();
  const count=await readCount(name);
  assertSession();
  if(!Number.isSafeInteger(count)||count<0)throw new Error('Invalid school count: '+name);
  return [name,count];
 }));
 assertSession();
 const after=await verifySchoolSession({schoolId,uid,readDocument});
 assertSession();
 if(after.role!==role)throw new Error('School membership changed while loading statistics');
 const result=Object.fromEntries(values);
 if(role==='school_admin'){
  const activeMembers=await readCount('members',{activeOnly:true});
  assertSession();
  if(!Number.isSafeInteger(activeMembers)||activeMembers<0||activeMembers>result.members)
   throw new Error('Invalid active membership count');
  const final=await verifySchoolSession({schoolId,uid,readDocument});
  assertSession();
  if(final.role!==role)throw new Error('School membership changed');
  result.activeMembers=activeMembers;
 }
 return Object.freeze({schoolId,role,...result});
}
export function dashboardStatsText(value){
 if(!value||typeof value!=='object')throw new TypeError('Statistics required');
 const labels=[['students','Students'],['staff','Staff / Teachers'],['subjects','Subjects'],['exams','Exam Terms']];
 if(value.role==='school_admin')labels.push(['members','Accounts'],['activeMembers','Active Memberships (not online)']);
 return labels.map(([key,label])=>{
  const count=value[key];
  if(!Number.isSafeInteger(count)||count<0)throw new TypeError('Invalid dashboard statistic: '+key);
  return label+': '+count;
 }).join(' · ');
}
