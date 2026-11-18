// V47-only scoped Firestore gateway. This module never grants permissions.
// Every operation still requires the deployed Firestore rules to authorize it.
import {assertVerifiedTenantSession} from './tenant-session.mjs';
import {tenantDocument,tenantCollection} from './tenant-paths.mjs';
import {assertDocumentId} from './school-scope.mjs';
const READABLE=new Set(['students','staff','classes','subjects','exams','marks','attendance','school_settings','mark_settings','subject_assignments','component_marks']);
const WRITABLE=new Set(['students','staff','classes','subjects','exams','marks','attendance','school_settings','mark_settings','subject_assignments','component_marks']);
function requireContext({session,schoolId,uid,collection}){
 assertVerifiedTenantSession(session,schoolId,uid);
 if(!READABLE.has(collection))throw new TypeError('Unsupported tenant collection');
 return {schoolId,collection};
}
export function tenantReadPlan({session,schoolId,uid,collection,id}){
 requireContext({session,schoolId,uid,collection});
 assertDocumentId(id);
 return Object.freeze({path:tenantDocument(schoolId,collection,id),operation:'get',requiresFirestoreRules:true});
}
export function tenantListPlan({session,schoolId,uid,collection}){
 requireContext({session,schoolId,uid,collection});
 return Object.freeze({path:tenantCollection(schoolId,collection),operation:'list',requiresFirestoreRules:true});
}
export function tenantWritePlan({session,schoolId,uid,collection,id,data,operation}){
 requireContext({session,schoolId,uid,collection});
 assertDocumentId(id);
 if(!WRITABLE.has(collection)||!['create','update'].includes(operation))throw new Error('Write operation not permitted');
 if(session.role!=='school_admin')throw new Error('School Admin required; teacher writes await server-side rules');
 if(!data||typeof data!=='object'||Array.isArray(data))throw new TypeError('Record object required');
 if(Object.hasOwn(data,'schoolId')&&data.schoolId!==schoolId)throw new Error('Cross-school identity rejected');
 if(operation==='create')return Object.freeze({path:tenantDocument(schoolId,collection,id),operation,data:{...data,schoolId},requiresFirestoreRules:true});
 if(Object.hasOwn(data,'schoolId'))throw new Error('Tenant identity cannot be patched');
 return Object.freeze({path:tenantDocument(schoolId,collection,id),operation,data:{...data},requiresFirestoreRules:true});
}
