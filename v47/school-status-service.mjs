import {canManageSchools} from './permissions.mjs';
import {validateSchoolId} from './school-paths.mjs';
export async function setSchoolActive({db,api,actor,schoolId,active}){
 if(!canManageSchools(actor))throw new Error('Super Admin required');
 validateSchoolId(schoolId);
 if(typeof active!=='boolean')throw new TypeError('Active must be boolean');
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firebase SDK');
 const ref=api.doc(db,'schools',schoolId);
 await api.runTransaction(db,async tx=>{
  const snapshot=await tx.get(ref);
  if(!snapshot?.exists?.())throw new Error('School does not exist');
  const school=snapshot.data();
  if(!school||school.id!==schoolId||school.iemisCode!==schoolId||typeof school.active!=='boolean')throw new Error('School registry identity mismatch');
  if(school.active===active)return;
  tx.update(ref,{active});
 });
 return {schoolId,active};
}
