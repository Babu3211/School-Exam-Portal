import {resolveOfficialClassMarks} from './server-official-marks-reader.mjs';
import {validateConfiguredMarkComponents,primaryAchievementPair,validatePrimaryAchievementValues} from './configured-mark-preflight.mjs';

// Final result boundary for server-reloaded roster and examination settings.
// This is a pure validator, NOT a Firestore fetch or publication executor.
export function resolveVerifiedOfficialClassMarks({settings,expectedStudentIds,...input}){
 const {schoolId,classId,subjectId,examId}=input;
 const components=validateConfiguredMarkComponents(settings,{schoolId,classId,subjectId,examId});
 if(!Array.isArray(expectedStudentIds)||expectedStudentIds.length<1||expectedStudentIds.length>1500)throw new Error('Authoritative class roster required');
 const roster=new Set();
 for(const studentId of expectedStudentIds){
  if(typeof studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(studentId)||roster.has(studentId))throw new Error('Invalid authoritative roster');
  roster.add(studentId);
 }
 const result=resolveOfficialClassMarks(input);
 if(!result.published)return result;
 if(result.rosterCount!==roster.size)throw new Error('Published class roster differs from authoritative roster');
 const limits=new Map(components.map(c=>[c.key,c.fullMarks]));
 const primaryPair=primaryAchievementPair(components,classId);
 for(const row of result.entries){
  if(!roster.has(row.studentId))throw new Error('Published marks include a foreign or inactive student');
  if(row.isAbsent){if(row.totalObtained!==0||row.values!==null)throw new Error('Invalid published absence');continue;}
  const keys=Object.keys(row.values);
  if(keys.length!==limits.size||keys.some(key=>!limits.has(key)))throw new Error('Published component keys differ from Examination Settings');
  for(const [key,max] of limits){
   if(!Object.hasOwn(row.values,key)||row.values[key]>max)throw new Error('Published mark exceeds Examination Settings');
  }
  validatePrimaryAchievementValues(primaryPair,row.values);
 }
 return Object.freeze({...result,components});
}
