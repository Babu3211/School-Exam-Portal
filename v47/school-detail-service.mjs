import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
export async function getSchoolDetails({db,api,actor,schoolId}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'read'))throw new Error('School access denied');
 if(typeof api?.doc!=='function'||typeof api?.getDoc!=='function')throw new TypeError('Missing Firebase SDK');
 const original={uid:actor?.uid,role:actor?.role,active:actor?.active,schoolId:actor?.schoolId};
 const verify=()=>{
  if(!canAccessSchool(actor,schoolId,'read')||actor?.uid!==original.uid||
     actor?.role!==original.role||actor?.active!==original.active||
     actor?.schoolId!==original.schoolId)
   throw new Error('School membership changed during detail read');
 };
 const snapshot=await api.getDoc(api.doc(db,'schools',schoolId));
 verify();
 if(!snapshot?.exists?.())throw new Error('School not found');
 const data=snapshot.data();
 if(snapshot.id!==schoolId||!data||typeof data!=='object'||Array.isArray(data)||
    data.id!==schoolId||data.iemisCode!==schoolId||
    typeof data.name!=='string'||data.name.trim().length<3||
    typeof data.active!=='boolean')
  throw new Error('School registry identity mismatch');
 if(data.active!==true&&actor.role!=='super_admin')throw new Error('School unavailable');
 verify();
 return {id:schoolId,name:data.name,iemisCode:schoolId,active:data.active};
}
