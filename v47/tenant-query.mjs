import {schoolCollectionPath} from './school-paths.mjs';
import {validatePageSize} from './pagination.mjs';
export function tenantQuerySpec({schoolId,collection,pageSize=100}){return Object.freeze({path:schoolCollectionPath(schoolId,collection),pageSize:validatePageSize(pageSize),orderBy:'__name__'});}
