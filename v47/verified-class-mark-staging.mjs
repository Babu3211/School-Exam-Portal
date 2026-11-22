import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {planCompleteClassMarkStaging} from './class-mark-staging-plan.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';

// Prepare only: authoritative Firestore roster, no client-provided roster shortcut.
// This must never write staging documents or mark records.
export async function prepareVerifiedClassMarkStaging({db,api,actor,schoolId,classId,term,subjectId,entries,chunkSize=200}){
 validateSchoolId(schoolId);
 if(typeof actor?.uid!=='string'||!actor.uid.trim()||actor.role!=='school_admin'||!canAccessSchool(actor,schoolId,'write'))
  throw new Error('School Admin permission required');
 for(const method of ['doc','getDoc'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firestore method '+method);
 const identity={uid:actor.uid,role:actor.role,schoolId:actor.schoolId,active:actor.active};
 const verify=()=>{
  if(!canAccessSchool(actor,schoolId,'write')||Object.keys(identity).some(key=>actor?.[key]!==identity[key]))
   throw new Error('School Admin identity changed during marks staging preparation');
 };
 const roster=await loadCompleteClassRoster({db,api,actor,schoolId,classId});
 verify();
 if(roster.students.some(student=>student.active!==true))throw new Error('Inactive student in authoritative class roster');
 const subjectRef=api.doc(db,'schools',schoolId,'subjects',subjectId);
 const snap=await api.getDoc(subjectRef);
 verify();
 if(!snap||typeof snap.exists!=='function'||typeof snap.data!=='function'||snap.exists()!==true)
  throw new Error('Active subject Examination Settings required');
 const settings=snap.data();
 verify();
 if(!settings||typeof settings!=='object'||Array.isArray(settings)||settings.id&&settings.id!==subjectId)
  throw new Error('Invalid Examination Settings');
 const plan=planCompleteClassMarkStaging({
  schoolId,classId,term,subjectId,expectedStudentIds:roster.studentIds,
  entries,subjectSettings:settings,chunkSize
 });
 verify();
 return Object.freeze({...plan,rosterPages:roster.pages});
}
