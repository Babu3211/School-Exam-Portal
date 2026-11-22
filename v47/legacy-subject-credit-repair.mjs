import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
// Repair one legacy V47 subject missing creditHour; never rewrite marks/settings.
// Firestore rules independently permit only adding this single absent field.
export async function addMissingSubjectCreditHour({db,api,actor,schoolId,subjectId,creditHour}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'write')||actor.role!=='school_admin')throw new Error('School Admin required');
 if(typeof subjectId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(subjectId))throw new Error('Invalid subject ID');
 if(typeof creditHour!=='number'||!Number.isFinite(creditHour)||creditHour<=0||creditHour>100)throw new Error('Valid credit hour required');
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new Error('Firestore transaction required');
 const identity={uid:actor.uid,role:actor.role,schoolId:actor.schoolId,active:actor.active};
 const ref=api.doc(db,'schools',schoolId,'subjects',subjectId);
 await api.runTransaction(db,async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists())throw new Error('Subject not found');
  const data=snap.data();
  if(data.schoolId!==schoolId||data.active!==true)throw new Error('Inactive or foreign subject');
  if(Object.hasOwn(data,'creditHour'))throw new Error('Credit hour already exists; refusing overwrite');
  if(actor.uid!==identity.uid||actor.role!==identity.role||actor.schoolId!==identity.schoolId||actor.active!==identity.active)throw new Error('School membership changed');
  tx.update(ref,{creditHour});
 });
 return {schoolId,subjectId,creditHour,updated:true};
}
