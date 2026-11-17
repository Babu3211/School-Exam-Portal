import {assertSchoolId} from './school-scope.mjs';
import {SCHOOL_ROLES} from './school-membership.mjs';
export function selectableSchools(memberships){
 if(!Array.isArray(memberships))throw new TypeError('Membership list required');
 const ids=new Set();
 return memberships.filter(m=>m?.active===true&&SCHOOL_ROLES.includes(m.role)&&typeof m.schoolId==='string').filter(m=>{try{assertSchoolId(m.schoolId);return true;}catch{return false;}}).filter(m=>{if(ids.has(m.schoolId))return false;ids.add(m.schoolId);return true;}).map(m=>({id:m.schoolId,role:m.role}));
}
export function chooseSchool(memberships,schoolId){
 assertSchoolId(schoolId);
 const match=selectableSchools(memberships).find(m=>m.id===schoolId);
 if(!match)throw new Error('No active membership for selected school');
 return match;
}
