import {assertSchoolId} from './school-scope.mjs';
export function tenantExportManifest(schoolId,collections){
 assertSchoolId(schoolId);
 if(!Array.isArray(collections)||collections.some(x=>typeof x!=='string'||!x.startsWith('schools/'+schoolId+'/')))throw new TypeError('Cross-tenant export rejected');
 return {version:47,schoolId,collections:[...new Set(collections)].sort(),requiresAdminApproval:true};
}
