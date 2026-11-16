import {prepareSchoolRegistration} from './registration-policy.mjs';
// Must be called with an authenticated Firebase client and deployed V47 rules.
export async function registerSchool({db,api,actor,form}){
 if(typeof api?.doc!=='function'||typeof api?.setDoc!=='function')throw new TypeError('Missing Firebase SDK');
 const school=prepareSchoolRegistration(actor,form);
 await api.setDoc(api.doc(db,'schools',school.id),school);
 return school;
}
