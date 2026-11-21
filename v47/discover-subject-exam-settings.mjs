import {validateConfiguredMarkComponents} from './configured-mark-preflight.mjs';
// Find the unique active settings record for a verified school/class/exam/subject.
// Fail closed on zero or multiple matches. No default marks or hardcoded Computer maxima.
export async function discoverVerifiedSubjectExamSettings({db,api,schoolId,subjectId,examId,classId,revalidate}){
 if(!db||!api||['collection','getDocs'].some(k=>typeof api[k]!=='function')||typeof revalidate!=='function')throw new Error('Verified Firestore settings discovery required');
 for(const [key,value] of Object.entries({schoolId,subjectId,examId,classId}))if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(value))throw new Error('Invalid '+key);
 await revalidate();
 const snapshot=await api.getDocs(api.collection(db,'schools',schoolId,'mark_settings'));
 await revalidate();
 if(!Array.isArray(snapshot?.docs)||snapshot.docs.length>500)throw new Error('Examination settings list too large or invalid');
 const matches=[];
 for(const doc of snapshot.docs){
  const data=doc.data();
  if(data?.schoolId!==schoolId||data?.subjectId!==subjectId||data?.examId!==examId||String(data?.classId)!==classId||data?.active!==true)continue;
  if(typeof doc.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(doc.id)||data.id!==doc.id)throw new Error('Invalid examination settings identity');
  const components=validateConfiguredMarkComponents(data,{schoolId,subjectId,examId,classId});
  matches.push(Object.freeze({settingsId:doc.id,schoolId,subjectId,examId,classId,active:true,components}));
 }
 if(matches.length!==1)throw new Error(matches.length?'Multiple active subject examination settings found':'No active subject examination settings found');
 return matches[0];
}
