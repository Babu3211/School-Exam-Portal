import {assertSchoolId} from './school-scope.mjs';
import {effectiveSchoolRole} from './access-policy.mjs';
export function resolveSchoolSession({schoolId,membership,schoolActive,isSuperAdmin=false}){
 assertSchoolId(schoolId);
 if(isSuperAdmin)return {schoolId,role:'super_admin',canRead:true,canManage:true};
 const role=effectiveSchoolRole({schoolId,membership,schoolActive});
 return {schoolId,role,canRead:role!==null,canManage:role==='school_admin'};
}
