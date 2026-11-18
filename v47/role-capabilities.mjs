import {SCHOOL_ROLES} from './school-membership.mjs';
export function roleCapabilities(role){
 if(!SCHOOL_ROLES.includes(role))throw new TypeError('Unknown school role');
 return Object.freeze({read:true,manage:role==='school_admin',marksWrite:role==='school_admin',attendanceWrite:role==='school_admin',delete:false});
}
