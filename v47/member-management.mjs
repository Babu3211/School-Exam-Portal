import {validateSchoolId} from './school-paths.mjs';
const MANAGED_ROLES=new Set(['teacher','viewer']);
export async function addSchoolMember({db,api,actor,schoolId,uid,role}){
 validateSchoolId(schoolId);
 if(actor?.active!==true||!['super_admin','school_admin'].includes(actor.role)||actor.role==='school_admin'&&actor.schoolId!==schoolId)throw new Error('Admin access required');
 if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{6,128}$/.test(uid))throw new Error('Invalid member UID');
 if(!MANAGED_ROLES.has(role))throw new Error('Use trusted Super Admin onboarding for admin roles');
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firebase SDK');
 const ref=api.doc(db,'schools',schoolId,'members',uid);
 await api.runTransaction(db,async tx=>{
  if((await tx.get(ref)).exists())throw new Error('Membership already exists');
  tx.set(ref,{uid,schoolId,role,active:true});
 });
 return {uid,schoolId,role};
}
