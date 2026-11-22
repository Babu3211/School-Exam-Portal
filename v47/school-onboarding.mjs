import {prepareSchoolRegistration} from './registration-policy.mjs';
import {canManageSchools} from './permissions.mjs';
// One atomic transaction: no half-created school without its first admin.
export async function onboardSchool({db,api,actor,form,adminUid}){
 const school=prepareSchoolRegistration(actor,form);
 const originalUid=actor.uid;
 if(typeof adminUid!=='string'||!/^[A-Za-z0-9_-]{6,128}$/.test(adminUid))throw new Error('Invalid admin UID');
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firebase SDK');
 const schoolRef=api.doc(db,'schools',school.id);
 const memberRef=api.doc(db,'schools',school.id,'members',adminUid);
 await api.runTransaction(db,async tx=>{
  const existing=await tx.get(schoolRef);
  if(existing.exists())throw new Error('School already registered');
  if(!canManageSchools(actor)||actor.uid!==originalUid)throw new Error('Super Admin identity changed during school registration');
  tx.set(schoolRef,school);
  tx.set(memberRef,{uid:adminUid,schoolId:school.id,role:'school_admin',active:true});
 });
 return {school,adminUid};
}
