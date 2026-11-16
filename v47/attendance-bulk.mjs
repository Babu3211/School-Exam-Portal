import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validateAttendance} from './attendance-service.mjs';
// Capped conservatively for Firestore Security Rules document-access budgets. No writes occur until all inputs validate.
export async function saveClassAttendance({db,api,actor,schoolId,entries}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
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
 const batch=api.writeBatch(db);
 for(const entry of validated)batch.set(api.doc(db,'schools',schoolId,'attendance',entry.date+'_'+entry.studentId),entry);
 await batch.commit();
 return {saved:validated.length,date,class:schoolClass};
}
