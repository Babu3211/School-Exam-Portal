import {assertSchoolId} from './school-scope.mjs';
import {SCHOOL_ROLES} from './school-membership.mjs';
// A conflicting duplicate membership is never allowed to select a role.
// Server-side Firestore rules, not this list, establish actual access.
export function selectableSchools(memberships){
 if(!Array.isArray(memberships))throw new TypeError('Membership list required');
 const bySchool=new Map();
 const conflicts=new Set();
 for(const m of memberships){
  if(m?.active!==true||!SCHOOL_ROLES.includes(m.role)||typeof m.schoolId!=='string')continue;
  try{assertSchoolId(m.schoolId);}catch{continue;}
  if(bySchool.has(m.schoolId)&&bySchool.get(m.schoolId)!==m.role)conflicts.add(m.schoolId);
  else bySchool.set(m.schoolId,m.role);
 }
 return [...bySchool].filter(([id])=>!conflicts.has(id)).map(([id,role])=>({id,role}));
}
export function chooseSchool(memberships,schoolId){
 assertSchoolId(schoolId);
 const match=selectableSchools(memberships).find(m=>m.id===schoolId);
 if(!match)throw new Error('No unambiguous active membership for selected school');
 return match;
}
