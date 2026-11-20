import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validateAttendance} from './attendance-service.mjs';
// Capped conservatively for Firestore Security Rules document-access budgets. No writes occur until all inputs validate.
export async function saveClassAttendance({db,api,actor,schoolId,entries}){
 validateSchoolId(schoolId);
 if(actor?.role!=='school_admin'||!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
 if(!Array.isArray(entries)||entries.length<1||entries.length>10)throw new RangeError('Enter 1–10 students per save');
 if(typeof api?.writeBatch!=='function'||typeof api?.doc!=='function')throw new TypeError('Missing Firebase SDK');
 const validated=entries.map(validateAttendance);
 const date=validated[0].date,schoolClass=validated[0].class;
 const ids=new Set();
 for(const entry of validated){
  if(entry.date!==date||entry.class!==schoolClass)throw new Error('All attendance must share class and date');
  if(ids.has(entry.studentId))throw new Error('Duplicate student ID');
  ids.add(entry.studentId);
 }
 if(typeof api?.getDoc!=='function')throw new TypeError('Student roster verification requires getDoc');
 const snapshots=await Promise.all(validated.map(e=>api.getDoc(api.doc(db,'schools',schoolId,'students',e.studentId))));
 for(let i=0;i<validated.length;i++)if(!snapshots[i].exists()||snapshots[i].data().schoolId!==schoolId||snapshots[i].data().class!==schoolClass)throw new Error('Student roster changed or school mismatch');
 if(actor.uid!==identity.uid||actor.role!==identity.role||actor.active!==identity.active||actor.schoolId!==identity.schoolId||!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin identity changed during attendance roster verification');
 const batch=api.writeBatch(db);
 for(const entry of validated)batch.set(api.doc(db,'schools',schoolId,'attendance',entry.date+'_'+entry.studentId),{...entry,schoolId});
 await batch.commit();
 return {saved:validated.length,date,class:schoolClass};
}
