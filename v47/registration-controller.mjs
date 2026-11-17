import {registerSchool,provisionSchoolMember} from './school-registry-service.mjs';
import {makeRegistryAdapter} from './firebase-registry-adapter.mjs';
// Supply an authenticated V47 Firestore instance and Firebase Web SDK methods.
// Rules reject non-Super-Admin registration and membership provisioning.
export function createRegistrationController({db,doc,runTransaction}) {
 const adapter=makeRegistryAdapter({db,doc,runTransaction});
 return {
  registerSchool:details=>registerSchool(adapter,details),
  provisionMember:details=>provisionSchoolMember(adapter,details)
 };
}
