import {validateRegistrationForm} from './school-registration-form.mjs';
import {superAdminMetrics} from './super-admin-dashboard.mjs';
import {normalizeSchoolList} from './school-directory.mjs';
// Framework-independent UI view-model. No production write until authenticated
// V47-only trusted registration endpoint is implemented.
export function superAdminViewModel({isSuperAdmin,schools=[],memberships=[],form={}}) {
  if(isSuperAdmin!==true) return {authorized:false,schools:[],metrics:null,registration:null};
  return {authorized:true,schools:normalizeSchoolList(schools),
    metrics:superAdminMetrics(schools,memberships),registration:validateRegistrationForm(form)};
}
