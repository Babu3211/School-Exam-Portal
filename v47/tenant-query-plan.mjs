import {tenantCollection} from './tenant-paths.mjs';
import {boundedPageSize} from './school-pagination.mjs';
export function planTenantQuery({schoolId,collection,limit=50,lastDocumentId=null}){
 if(!['students','staff','classes','subjects','exams','marks','attendance','school_settings'].includes(collection))throw new TypeError('Collection is not approved for V47 query planning');
 const path=tenantCollection(schoolId,collection);
 if(lastDocumentId!==null&&(typeof lastDocumentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(lastDocumentId)))throw new TypeError('Invalid cursor');
 return {path,limit:boundedPageSize(limit),orderBy:'__name__',lastDocumentId,requiresServerRules:true};
}
