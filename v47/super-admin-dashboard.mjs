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
