import {validateConfiguredMarkComponents} from './configured-mark-preflight.mjs';
import {primarySubjectKey} from './primary-assessment-teacher-worksheet.mjs';
import {iemisSubjectKey} from './iemis-ledger.js';
import {previewV46PrimaryAchievementSettings} from './preview-v46-primary-achievement-settings.mjs';
import {prepareNewSubjectExamSettings} from './create-subject-exam-settings.mjs';

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

// Share the existing candidate aliases with the staged audit. Aliases are
// suggestions only; the administrator sees the original label before saving.
export function legacySettingsSubjectKey(label,grade){
 if(typeof label!=='string'||!label.trim())return null;
 return Number(grade)<=5?primarySubjectKey(label)??iemisSubjectKey(label):iemisSubjectKey(label);
}
// V46 index.html blob 1d5ab6bd9c8d1aed881b32b27cf19c78ecb58515,
// selectedEntrySetting() and updateMarkSubjectOptions(): class-specific
// saved record takes precedence over a group fallback. Never choose between
// multiple records at the preferred precedence or silently repair a bad record.
// This copies SAVED components only, not V46's derived annual theory column.
export function prepareLegacySettingsEditor({schoolId,classId,subjectId,examId,subjects,records}){
 const group=Object.keys(groups).find(g=>groups[g].includes(classId));
 if(!group||!Array.isArray(subjects)||subjects.length>100||!Array.isArray(records)||records.length>200)throw Error('Unsupported legacy settings scope');
 if(new Set(subjects.map(s=>s.id)).size!==subjects.length||new Set(records.map(r=>r.id)).size!==records.length)throw Error('Duplicate catalogue or settings identity');
 const subject=subjects.find(s=>s.id===subjectId&&s.active===true);
 const key=legacySettingsSubjectKey(subject?.name,classId);
 if(!key||subjects.filter(s=>s.active===true&&legacySettingsSubjectKey(s.name,classId)===key).length!==1)throw Error('Legacy subject identity is ambiguous');
 for(const r of records)if(!r||typeof r.id!=='string'||!r.id||r.id.includes('/')||r.fields?.schoolId!==schoolId||r.fields?.classGroup!==group)throw Error('Foreign or invalid legacy settings record');
 const candidates=records.filter(({fields:d})=>legacySettingsSubjectKey(d.subject,classId)===key&&
  !['classId','subjectId','examId','term','examName'].some(k=>d[k]!==undefined&&d[k]!==null&&d[k]!==''));
 const exact=candidates.filter(({fields:d})=>String(d.className??'')===classId);
 const fallback=candidates.filter(({fields:d})=>!d.className);
 const choices=exact.length?exact:fallback;
 if(choices.length!==1)throw Error(choices.length?'Multiple preferred legacy settings':'No matching saved legacy settings');
 const source=choices[0],legacy={...source.fields,subject:subject.name};
 const input={legacy,schoolId,classId,subjectId,examId,verifiedSubjectName:subject.name};
 let components;
 if(Number(classId)<=5&&isLegacyPrimaryAchievement(legacy)){
  const p=previewV46PrimaryAchievementSettings(input);
  components=[{key:'count',name:'No. of Learning Achievement',fullMarks:p.learningAchievementCount},{key:'obtained',name:'Obtained Learning Achievement',fullMarks:p.obtainedAchievementMaximum}];
 }else components=previewV46MarkSettingsMigration(input).settings.components;
 const settings=prepareNewSubjectExamSettings({schoolId,classId,subjectId,examId,components});
 if(settings.components.some(c=>/[,\r\n]/.test(c.name)))throw Error('Legacy component label requires manual entry');
 return Object.freeze({settings,sourceId:source.id,sourceSubject:source.fields.subject,sourceScope:exact.length?'Class-specific':'Group fallback',writeAuthorized:false,requiresManualApproval:true});
}
