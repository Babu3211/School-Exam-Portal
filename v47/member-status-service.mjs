import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
export async function setSchoolMemberActive({db,api,actor,schoolId,uid,active,expectedActive}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin required');
 if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(uid))throw new Error('Invalid member UID');
 if(typeof active!=='boolean')throw new TypeError('Active must be boolean');
 if(expectedActive!==undefined&&typeof expectedActive!=='boolean')throw new TypeError('Expected active must be boolean');
 if(uid===actor.uid)throw new Error('Cannot change own membership');
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firebase SDK');
 const ref=api.doc(db,'schools',schoolId,'members',uid);
 await api.runTransaction(db,async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists())throw new Error('Member missing');
  const member=snap.data();
  if(member.schoolId!==schoolId||member.uid!==uid||!['teacher','viewer'].includes(member.role))throw new Error('Cannot modify protected member');
  if(expectedActive!==undefined&&member.active!==expectedActive)throw new Error('Member status changed; search again');
  tx.update(ref,{active});
 });
 return {schoolId,uid,active};
}
