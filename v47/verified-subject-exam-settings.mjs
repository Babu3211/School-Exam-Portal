import {validateConfiguredMarkComponents} from './configured-mark-preflight.mjs';
// Read-only, fail-closed loader. Settings are never inferred from Computer defaults.
export async function loadVerifiedSubjectExamSettings({db,api,schoolId,subjectId,examId,classId,settingsId,revalidate}){
 if(!db||!api||typeof api.doc!=='function'||typeof api.getDoc!=='function'||typeof revalidate!=='function')throw new Error('Verified Firestore settings loader required');
 for(const [name,value] of Object.entries({schoolId,subjectId,examId,classId,settingsId})){
  if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(value))throw new Error('Invalid '+name);
 }
 await revalidate();
 const ref=api.doc(db,'schools',schoolId,'mark_settings',settingsId);
 const snap=await api.getDoc(ref);
 await revalidate();
 if(!snap?.exists?.())throw new Error('Subject examination settings not found');
 const data=snap.data();
 if(!data||data.id!==settingsId)throw new Error('Subject examination settings identity mismatch');
 const components=validateConfiguredMarkComponents(data,{schoolId,subjectId,examId,classId});
 return Object.freeze({settingsId,schoolId,subjectId,examId,classId,active:true,components});
}
