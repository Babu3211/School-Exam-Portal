import {validateSchoolId} from './school-paths.mjs';
const ROLES=new Set(['school_admin','teacher','viewer']);
export function validateMembership({uid,schoolId,role,active=false}){
 if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{6,128}$/.test(uid))throw new Error('Invalid user ID');
 validateSchoolId(schoolId);
 if(!ROLES.has(role))throw new Error('Invalid school role');
 if(typeof active!=='boolean')throw new Error('Invalid membership status');
 return {uid,schoolId,role,active};
}
