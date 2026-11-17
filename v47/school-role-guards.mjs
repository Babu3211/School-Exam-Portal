import {canReadSchool,canManageSchool} from './school-membership.mjs';
import {isAssigned} from './school-assignments.mjs';
export function authorizeSchoolAction({membership,action,schoolId,className,subject,section,assignments=[]}){
 if(membership?.schoolId!==schoolId)return false;
 if(action==='read')return canReadSchool(membership);
 if(action==='manage')return canManageSchool(membership);
 if(action!=='write'||membership?.active!==true)return false;
 if(membership.role==='school_admin')return true;
 if(membership.role!=='teacher')return false;
 return isAssigned(assignments,schoolId,className,subject,section);
}
