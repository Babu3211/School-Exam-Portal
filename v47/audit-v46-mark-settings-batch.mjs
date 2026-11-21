import {previewV46MarkSettingsMigration} from './preview-v46-mark-settings-migration.mjs';
import {previewV46PrimaryAchievementSettings} from './preview-v46-primary-achievement-settings.mjs';

// Batch-level READ-ONLY audit. Refuse ambiguous target identities and
// conflicting settings; no automatic migration or Firestore writes.
export function auditV46MarkSettingsBatch({records,schoolId,examId}){
 if(!Array.isArray(records)||records.length===0||records.length>500)throw new Error('A bounded V46 settings audit batch is required');
 const previews=[],errors=[],targets=new Set();
 for(let index=0;index<records.length;index++){
  const row=records[index];
  try{
   if(!row||typeof row!=='object'||typeof row.classId!=='string'||typeof row.subjectId!=='string'||typeof row.verifiedSubjectName!=='string')throw new Error('Verified class and subject mapping required');
   const target=JSON.stringify([schoolId,row.classId,row.subjectId,examId]);
   if(targets.has(target))throw new Error('Duplicate target subject examination settings');
   const input={legacy:row.legacy,schoolId,classId:row.classId,subjectId:row.subjectId,examId,verifiedSubjectName:row.verifiedSubjectName};
   const preview=['1','2','3','4','5'].includes(row.classId)?previewV46PrimaryAchievementSettings(input):previewV46MarkSettingsMigration(input);
   targets.add(target);
   previews.push(Object.freeze({index,classId:row.classId,subjectId:row.subjectId,kind:preview.requiresDedicatedIemisEntry?'primary-achievement':'component-marks',preview}));
  }catch(error){errors.push(Object.freeze({index,message:String(error?.message||error)}))}
 }
 return Object.freeze({schoolId,examId,total:records.length,valid:previews.length,invalid:errors.length,previews:Object.freeze(previews),errors:Object.freeze(errors),complete:errors.length===0,writeAuthorized:false,requiresManualApproval:true});
}
