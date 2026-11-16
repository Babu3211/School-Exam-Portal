import {canManageSchools} from './permissions.mjs';
import {validateSchoolRegistration} from './school-registry.mjs';
export function prepareSchoolRegistration(actor,form){
 if(!canManageSchools(actor))throw new Error('Only active Super Admin can register schools');
 return validateSchoolRegistration(form);
}
