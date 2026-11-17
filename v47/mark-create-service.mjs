import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validateMarkEntry,markEntryId} from './marks-service.mjs';
// Transactionally create a raw mark; never overwrite an existing record.
export async function createSchoolMarkOnly({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const entry=validateMarkEntry(input),id=markEntryId(entry);
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firestore transaction methods');
 const markRef=api.doc(db,'schools',schoolId,'marks',id);
 await api.runTransaction(db,async tx=>{
  const existing=await tx.get(markRef);
  if(existing.exists())throw new Error('Mark already exists; overwrite blocked');
  tx.set(markRef,entry);
 });
 return {id,...entry};
}
