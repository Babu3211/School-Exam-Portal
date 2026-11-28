import {validateConfiguredMarkComponents} from './configured-mark-preflight.mjs';
import {validateSchoolId} from './school-paths.mjs';

// Create-once exam settings. Never update an existing settings record.
export function prepareNewSubjectExamSettings({schoolId,classId,subjectId,examId,components}){
 validateSchoolId(schoolId);
 if(!['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))].includes(classId))throw new Error('Invalid class');
 if(typeof subjectId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(subjectId))throw new Error('Invalid subject');
 if(!Array.isArray(components)||components.length<1||components.length>6)throw new Error('Require 1–6 mark components');
 if(!['weekly','monthly','1st','2nd','3rd','final'].includes(examId))throw new Error('Invalid examination term');
 const id=classId+'_'+subjectId+'_'+examId;
 if(id.length>128)throw new Error('Settings document ID exceeds 128 characters');
 const normalized=validateConfiguredMarkComponents({schoolId,classId,subjectId,examId,active:true,components},{schoolId,classId,subjectId,examId});
 if(normalized.length>6)throw new Error('Maximum six configured components per subject');
 if(new Set(normalized.map(c=>c.key)).size!==normalized.length)throw new Error('Duplicate component keys');
 return Object.freeze({id,schoolId,classId,subjectId,examId,active:true,components:normalized});
}
export async function createNewSubjectExamSettings({db,api,actor,settings,additionalTerms=[]}){
 if(actor?.role!=='school_admin'||actor?.active!==true||actor?.schoolId!==settings?.schoolId||!actor.uid)throw new Error('School Admin required');
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new Error('Firestore create API required');
 const prepared=prepareNewSubjectExamSettings(settings);
 if(settings.id!==prepared.id)throw new Error('Settings document ID mismatch');
 if(!Array.isArray(additionalTerms)||additionalTerms.length>5||new Set([prepared.examId,...additionalTerms]).size!==additionalTerms.length+1)throw Error('Choose distinct examination terms');
 const additional=additionalTerms.map(examId=>prepareNewSubjectExamSettings({...prepared,examId}));
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
 const check=()=>{if(Object.keys(identity).some(k=>actor[k]!==identity[k]))throw Error('School Admin identity changed')};
 // Read-before-write in a transaction prevents overwriting existing settings,
 // even if production Firestore Rules have not yet been deployed.
 const ref=api.doc(db,'schools',prepared.schoolId,'mark_settings',prepared.id);
 await api.runTransaction(db,async transaction=>{
  check();
  const existing=await transaction.get(ref);
  if(existing.exists())throw new Error('Settings already exist. No changes made');
  const subjectRef=api.doc(db,'schools',prepared.schoolId,'subjects',prepared.subjectId);
  const subject=await transaction.get(subjectRef);
  const subjectData=subject.exists()?subject.data():null;
  if(!subjectData||subjectData.schoolId!==prepared.schoolId||subjectData.class!==prepared.classId||subjectData.active!==true)throw new Error('Selected subject is not active in this school and class');
  const targets=additional.map(data=>({data,ref:api.doc(db,'schools',prepared.schoolId,'mark_settings',data.id)}));
  for(const target of targets){const snapshot=await transaction.get(target.ref);if(snapshot.exists())throw Error('Settings already exist. No changes made');}
  check();
  transaction.set(ref,prepared);
  for(const target of targets)transaction.set(target.ref,target.data);
 });
 return Object.freeze({created:true,settingsId:prepared.id,schoolId:prepared.schoolId,createdCount:1+additional.length});
}
