import {validateSchoolId} from './school-paths.mjs';
// Direct, tenant-scoped member lookup. No cross-school collection-group query.
export async function findSchoolMember({db,api,actor,schoolId,uid}){
 validateSchoolId(schoolId);
 if(actor?.active!==true||actor?.role!=='school_admin'||actor.schoolId!==schoolId||typeof actor.uid!=='string')throw new Error('School Admin access required');
 if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(uid))throw new Error('Invalid member UID');
 if(typeof api?.doc!=='function'||typeof api?.getDoc!=='function')throw new TypeError('Missing Firebase document reader');
 const snap=await api.getDoc(api.doc(db,'schools',schoolId,'members',uid));
 if(!snap||typeof snap.exists!=='function'||!snap.exists())return null;
 const record=snap.data();
 if(!record||record.uid!==uid||record.schoolId!==schoolId||!['school_admin','teacher','viewer'].includes(record.role)||typeof record.active!=='boolean')throw new Error('Invalid or cross-school member record');
 return Object.freeze({uid,role:record.role,active:record.active});
}
