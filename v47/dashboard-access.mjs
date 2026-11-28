// Dashboard visibility is not authorization: each destination must reverify Firestore.
// All module links remain visible; role-specific actions cannot be opened by
// unrelated roles. Firestore rules remain the final enforcement boundary.
export function schoolDashboardAccess(role, moduleName) {
 if(!['school_admin','teacher','viewer'].includes(role))return false;
 if(moduleName==='school-admin')return role==='school_admin';
 if(moduleName==='teacher')return role==='teacher';
 return moduleName==='module';
}
