import {chooseSchool} from './school-selector.mjs';
export function selectTenantSession(memberships,schoolId){
 const membership=chooseSchool(memberships,schoolId);
 return Object.freeze({schoolId:membership.id,role:membership.role});
}
export function assertSessionSchool(session,schoolId){
 if(!session||session.schoolId!==schoolId)throw new Error('Session school mismatch');
 return schoolId;
}
