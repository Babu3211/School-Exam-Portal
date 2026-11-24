import {normalizeSchoolList} from './school-directory.mjs';
export function superAdminMetrics(schools, memberships=[]){
 const rows=normalizeSchoolList(schools);
 const active=rows.filter(s=>s.active);
 const memberCount=new Map();
 for(const m of memberships){
   if(!m||m.active!==true||typeof m.schoolId!=='string')continue;
   memberCount.set(m.schoolId,(memberCount.get(m.schoolId)||0)+1);
 }
 return {totalSchools:rows.length,activeSchools:active.length,inactiveSchools:rows.length-active.length,
   totalActiveMembers:active.reduce((n,s)=>n+(memberCount.get(s.id)||0),0)};
}

// Count queries over the actual school registry, not just the 30 displayed rows.
// No recurring background polling or full-school roster scans.
export async function loadPlatformSchoolCounts({db,api,actor,assertSession}){
 if(actor?.active!==true||actor.role!=='super_admin'||!actor.uid||typeof assertSession!=='function')throw Error('Verified Super Admin required');
 assertSession();
 const schools=api.collection(db,'schools');
 const results=await Promise.all([api.getCountFromServer(schools),
  api.getCountFromServer(api.query(schools,api.where('active','==',true)))]);
 assertSession();
 const [total,active]=results.map(s=>s.data().count);
 if(!Number.isSafeInteger(total)||!Number.isSafeInteger(active)||active<0||total<active)throw Error('Invalid school counts');
 return {totalSchools:total,activeSchools:active,inactiveSchools:total-active};
}
