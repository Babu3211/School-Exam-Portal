import {normalizeSchool,schoolRegistryPath} from './school-registry.mjs';
import {normalizeMembership} from './school-membership.mjs';
export function prepareSchoolRegistration(input,adminUid){
 const school=normalizeSchool(input);
 const admin=normalizeMembership(school.id,adminUid,'school_admin');
 return {schoolPath:schoolRegistryPath(school.id),school,adminMembershipPath:admin.path,adminMembership:{schoolId:school.id,uid:adminUid,role:'school_admin',active:true},requiresSuperAdmin:true};
}
