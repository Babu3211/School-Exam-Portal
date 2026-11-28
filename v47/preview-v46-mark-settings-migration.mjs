import {validateConfiguredMarkComponents} from './configured-mark-preflight.mjs';

// READ-ONLY V46 -> V47 compatibility preview. No database writes.
// V46 uses classGroup/subject and component name/fullMarks; V47 requires
// an explicit school/class/exam/subject identity. Never guess the exam term.
const groups={'1-3':['1','2','3'],'4-5':['4','5'],'6-8':['6','7','8'],'9-10':['9','10']};
export const isLegacyPrimaryAchievement=legacy=>Array.isArray(legacy?.components)&&legacy.components.some(c=>typeof c?.name==='string'&&/^(?:no\.?\s*of\s*learning achievement|obtained learning achievement)$/i.test(c.name.trim()));
const safeId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
export function previewV46MarkSettingsMigration({legacy,schoolId,classId,subjectId,examId,verifiedSubjectName}){
 if(!/^\d{5,20}$/.test(schoolId)||![...Object.values(groups).flat(),'ECD','LKG','UKG','11','12'].includes(classId)||!safeId(subjectId)||!['weekly','monthly','1st','2nd','3rd','final'].includes(examId))throw new Error('Explicit verified V47 school, class, subject and exam identity required');
 if(!legacy||!groups[legacy.classGroup]?.includes(classId))throw new Error('Legacy class group does not include target class');
 if(typeof legacy.className==='string'&&legacy.className.trim()&&legacy.className.trim()!==classId)throw new Error('Legacy class-specific setting belongs to another class');
 if(typeof legacy.subject!=='string'||!legacy.subject.trim()||typeof verifiedSubjectName!=='string'||legacy.subject.trim().toLocaleLowerCase('en')!==verifiedSubjectName.trim().toLocaleLowerCase('en'))throw new Error('Legacy subject name does not match verified subject');
 if(!Array.isArray(legacy.components)||legacy.components.length<1||legacy.components.length>6)throw new Error('Legacy components missing or exceed V46 six-part limit');
 // V46 primary classes use achievement counts and derived full marks, not
 // ordinary obtained-mark components. These need a dedicated IEMIS mapping.
 if(['1-3','4-5'].includes(legacy.classGroup)&&isLegacyPrimaryAchievement(legacy))throw new Error('Primary learning-achievement settings require dedicated IEMIS migration; ordinary marks conversion forbidden');
 if(legacy.totalFullMarks!==undefined&&(!Number.isFinite(legacy.totalFullMarks)||Math.abs(legacy.components.reduce((n,c)=>n+Number(c?.fullMarks??NaN),0)-legacy.totalFullMarks)>0.000001))throw new Error('Legacy total full marks mismatch');
 const used=new Set();
 const components=legacy.components.map((part,index)=>{
  if(!part||typeof part.name!=='string'||!part.name.trim()||typeof part.fullMarks!=='number'||!Number.isFinite(part.fullMarks)||part.fullMarks<=0||part.fullMarks>5000)throw new Error('Legacy component needs a positive full marks value');
  const key='component_'+String(index+1);
  if(used.has(key))throw new Error('Duplicate generated component key');
  used.add(key);
  return {key,name:part.name.trim(),fullMarks:part.fullMarks};
 });
 const settings={schoolId,classId,subjectId,examId,active:true,components};
 validateConfiguredMarkComponents(settings,{schoolId,classId,subjectId,examId});
 return Object.freeze({settings:Object.freeze({...settings,components:Object.freeze(components.map(x=>Object.freeze(x)))}),writeAuthorized:false,requiresManualApproval:true,warning:'Read-only preview: verify subject identity, term, class and component maxima before any migration'});
}
