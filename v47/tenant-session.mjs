import {chooseSchool} from './school-selector.mjs';
export function selectTenantSession(memberships,schoolId){
 const membership=chooseSchool(memberships,schoolId);
 return Object.freeze({schoolId:membership.id,role:membership.role,authorization:'unverified-client-selection'});
}
export function assertVerifiedTenantSession(session,schoolId,uid){
 if(!session||session.authorization!=='firestore-verified-read'||session.schoolId!==schoolId||session.uid!==uid)throw new Error('Verified tenant session required');
 return session;
}
export function assertSessionSchool(session,schoolId){
 if(!session||session.schoolId!==schoolId)throw new Error('Session school mismatch');
 return schoolId;
}
