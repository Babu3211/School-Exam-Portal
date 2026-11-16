import {prepareSchoolRegistration} from './registration-policy.mjs';
// Requires authenticated Firebase client and deployed V47 rules. Never overwrite an existing school.
export async function registerSchool({db,api,actor,form}){
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firebase SDK');
 const school=prepareSchoolRegistration(actor,form);
 const ref=api.doc(db,'schools',school.id);
 await api.runTransaction(db,async transaction=>{
  const existing=await transaction.get(ref);
  if(existing.exists())throw new Error('School ID already exists');
  transaction.set(ref,school);
 });
 return school;
}
