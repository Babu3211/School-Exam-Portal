// Dashboard visibility is not authorization: each destination must reverify Firestore.
// All module links remain visible, but School Admin management is not navigable by
// Teacher/Viewer. Firestore rules remain the final enforcement boundary.
export function schoolDashboardAccess(role, moduleName) {
 if(!['school_admin','teacher','viewer'].includes(role))return false;
 if(moduleName==='school-admin')return role==='school_admin';
 return true;
}
