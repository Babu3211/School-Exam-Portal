import {validateSchoolId} from './school-paths.mjs';
export function resolveSchoolContext(member,requestedSchoolId){
 if(!member||member.active!==true)throw new Error('Inactive membership');
 const schoolId=validateSchoolId(requestedSchoolId);
 if(!['super_admin','school_admin','teacher','viewer'].includes(member.role))throw new Error('Unknown role');
 if(member.role!=='super_admin'&&member.schoolId!==schoolId)throw new Error('School access denied');
 return Object.freeze({schoolId,role:member.role});
}
