import {canReadSchool,canManageSchool} from './school-membership.mjs';
// Teacher assignment checks are advisory only; Firestore rules currently deny teacher writes.
export function authorizeSchoolAction({membership,action,schoolId,className,subject,section,assignments=[]}){
 if(membership?.schoolId!==schoolId)return false;
 if(action==='read')return canReadSchool(membership);
 if(action==='manage')return canManageSchool(membership);
 if(action!=='write'||membership?.active!==true)return false;
 if(membership.role==='school_admin')return true;
 if(membership.role!=='teacher')return false;
 return false; // Fail closed until server-side class/subject assignment rules are deployed.
}
