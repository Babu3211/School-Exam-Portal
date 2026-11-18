// V47-only collection allowlist. Client path validation is defense-in-depth;
// Firestore rules must independently enforce membership and authorization.
import {schoolCollectionPath,schoolDocumentPath} from './school-scope.mjs';

export const V47_SCHOOL_COLLECTIONS=Object.freeze([
 'students','staff','teachers','subjects','exams','marks','attendance',
 'school_settings','members','classes','mark_settings','subject_assignments','component_marks','assessment_settings','question_papers',
 'audit_logs','results'
]);
const allowed=new Set(V47_SCHOOL_COLLECTIONS);
export function tenantCollection(schoolId,collection){
 if(!allowed.has(collection))throw new TypeError('Unsupported V47 school collection');
 return schoolCollectionPath(schoolId,collection);
}
export function tenantDocument(schoolId,collection,id){
 if(!allowed.has(collection))throw new TypeError('Unsupported V47 school collection');
 return schoolDocumentPath(schoolId,collection,id);
}
export function assertTenantPath(schoolId,path){
 if(typeof path!=='string')throw new TypeError('Invalid tenant path');
 const parts=path.split('/');
 if(parts.length!==3&&parts.length!==4)throw new TypeError('Invalid tenant path');
 if(parts[0]!=='schools'||parts[1]!==schoolId)throw new TypeError('Cross-school path rejected');
 const canonical=parts.length===3?tenantCollection(schoolId,parts[2]):tenantDocument(schoolId,parts[2],parts[3]);
 if(path!==canonical)throw new TypeError('Invalid tenant path');
 return path;
}
