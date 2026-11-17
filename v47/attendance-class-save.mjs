import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validateAttendance} from './attendance-service.mjs';
import {saveClassAttendance} from './attendance-bulk.mjs';
export class PartialAttendanceSaveError extends Error {
 constructor(saved,total,cause){super('Attendance partly saved: '+saved+' of '+total+' records. Remaining records were not saved.');this.name='PartialAttendanceSaveError';this.saved=saved;this.total=total;this.cause=cause;}
}
// Multiple batches are NOT one atomic transaction. Stop immediately on failure and report partial progress.
export async function saveLoadedClassAttendance({db,api,actor,schoolId,entries,onProgress=()=>{}}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 if(!Array.isArray(entries)||entries.length===0||entries.length>1500)throw new RangeError('Enter 1–1500 selected students');
 const validated=entries.map(validateAttendance);
 const date=validated[0].date,schoolClass=validated[0].class,ids=new Set();
 for(const entry of validated){if(entry.date!==date||entry.class!==schoolClass)throw new Error('Mixed class or date');if(ids.has(entry.studentId))throw new Error('Duplicate student ID');ids.add(entry.studentId);}
 let saved=0;
 for(let offset=0;offset<validated.length;offset+=10){
  const chunk=validated.slice(offset,offset+10);
  try{await saveClassAttendance({db,api,actor,schoolId,entries:chunk});}
  catch(cause){if(saved===0)throw cause;throw new PartialAttendanceSaveError(saved,validated.length,cause);}
  saved+=chunk.length;
  try{onProgress({saved,total:validated.length,savedIds:chunk.map(e=>e.studentId)});}catch(error){/* UI callback failures must not turn a committed batch into a misleading save failure. */}
 }
 return {saved,total:validated.length,date,class:schoolClass};
}
