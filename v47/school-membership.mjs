import {validateSchoolId} from './school-paths.mjs';
const ROLES=new Set(['school_admin','teacher','viewer']);
export function validateMembership({uid,schoolId,role,active=false}){
 if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{6,128}$/.test(uid))throw new Error('Invalid user ID');
 validateSchoolId(schoolId);
 if(!ROLES.has(role))throw new Error('Invalid school role');
 if(typeof active!=='boolean')throw new Error('Invalid membership status');
 return {uid,schoolId,role,active};
}

export const SCHOOL_ROLES=Object.freeze(['school_admin','teacher','viewer']);
export function normalizeMembership(schoolId,uid,role){
 const membership=validateMembership({uid,schoolId,role,active:true});
 return {...membership,path:'schools/'+schoolId+'/members/'+uid};
}
export function canReadSchool(m){return m?.active===true&&SCHOOL_ROLES.includes(m.role);}
export function canManageSchool(m){return m?.active===true&&m.role==='school_admin';}
export function canWriteSchool(m){return m?.active===true&&['school_admin','teacher'].includes(m.role);}
