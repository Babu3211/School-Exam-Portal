import {assertSchoolId} from './school-scope.mjs';
import {assertTenantPath} from './tenant-paths.mjs';
export function tenantExportManifest(schoolId,collections){
 assertSchoolId(schoolId);
 if(!Array.isArray(collections)||collections.some(x=>{try{assertTenantPath(schoolId,x);return x.split('/').length!==3||x.endsWith('/members');}catch{return true;}}))throw new TypeError('Cross-tenant export rejected');
 return {version:47,schoolId,collections:[...new Set(collections)].sort(),requiresAdminApproval:true};
}
