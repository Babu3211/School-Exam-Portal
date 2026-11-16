import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
export async function getSchoolDetails({db,api,actor,schoolId}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'read'))throw new Error('School access denied');
 if(typeof api?.doc!=='function'||typeof api?.getDoc!=='function')throw new TypeError('Missing Firebase SDK');
 const snapshot=await api.getDoc(api.doc(db,'schools',schoolId));
 if(!snapshot.exists())throw new Error('School not found');
 return {...snapshot.data(),id:snapshot.id};
}
