// Rehydrate a previously saved V47 class DRAFT only after reloading the
// authoritative roster and immutable Examination Settings for THIS school.
// Untrusted draft rows are never accepted as official results or grades.
import {validateSchoolId} from './school-paths.mjs';
import {inspectConfiguredClassMarks} from './configured-mark-preflight.mjs';
import {CLASS_DRAFT_FORMAT,completeClassDraftId} from './complete-class-draft-document.mjs';
const isId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
export function verifyStoredCompleteClassDraft({
 schoolId,classId,subjectId,examId,settings,expectedStudentIds,stored
}){
 validateSchoolId(schoolId);
 const id=completeClassDraftId({classId,subjectId,examId});
 if(settings?.settingsId!==id)throw Error('Selected Examination Settings do not match stored draft');
 if(!stored||typeof stored!=='object'||Array.isArray(stored))throw Error('Stored class Draft required');
 const keys=['format','state','schoolId','classId','subjectId','examId','settingsId',
  'rosterCount','revision','updatedBy','updatedAt','entries'];
 if(Object.keys(stored).sort().join(',')!==keys.sort().join(','))
  throw Error('Unexpected stored Draft fields');
 if(stored.format!==CLASS_DRAFT_FORMAT||stored.state!=='draft'||stored.schoolId!==schoolId||
    stored.classId!==classId||stored.subjectId!==subjectId||stored.examId!==examId||
    stored.settingsId!==id)throw Error('Stored Draft school/class/subject/term mismatch');
 if(!Number.isSafeInteger(stored.revision)||stored.revision<1||stored.revision>1000000001||
    !isId(stored.updatedBy))throw Error('Invalid stored Draft revision or author');
 if(!Array.isArray(expectedStudentIds)||expectedStudentIds.length<1||expectedStudentIds.length>1500||
    !Number.isSafeInteger(stored.rosterCount)||stored.rosterCount!==expectedStudentIds.length||
    !Array.isArray(stored.entries)||stored.entries.length!==stored.rosterCount)
  throw Error('Saved Draft no longer matches the full class roster');
 const drafts=[];
 for(const row of stored.entries){
  if(!row||typeof row!=='object'||Array.isArray(row)||
     Object.keys(row).sort().join(',')!=='isAbsent,studentId,totalObtained,values')
   throw Error('Malformed saved Draft student row');
  if(!isId(row.studentId)||typeof row.isAbsent!=='boolean'||
     typeof row.totalObtained!=='number'||!Number.isFinite(row.totalObtained))
   throw Error('Invalid saved Draft student identity or obtained total');
  if(row.isAbsent){
   if(row.values!==null||row.totalObtained!==0)throw Error('Invalid absent Draft row');
   drafts.push({studentId:row.studentId,isAbsent:true});
  }else{
   if(!row.values||typeof row.values!=='object'||Array.isArray(row.values))
    throw Error('Invalid saved Draft component values');
   drafts.push({studentId:row.studentId,isAbsent:false,values:row.values});
  }
 }
 const checked=inspectConfiguredClassMarks({
  schoolId,classId,subjectId,examId,settings,expectedStudentIds,drafts
 });
 if(!checked.complete||checked.rosterCount!==stored.rosterCount)throw Error('Saved Draft incomplete or exceeds Examination Settings');
 const normalized=new Map(checked.ready.map(row=>[row.studentId,row]));
 const restored=[];
 for(const row of stored.entries){
  const value=normalized.get(row.studentId);
  if(!value||value.isAbsent!==row.isAbsent||
     Math.abs(value.totalObtained-row.totalObtained)>1e-7)throw Error('Saved Draft obtained total mismatch');
  restored.push(Object.freeze({studentId:row.studentId,isAbsent:row.isAbsent,
   values:row.isAbsent?null:Object.freeze({...value.values}),totalObtained:value.totalObtained}));
 }
 return Object.freeze({schoolId,classId,subjectId,examId,revision:stored.revision,
  entries:Object.freeze(restored),rosterCount:restored.length,
  previewOnly:true,publicationAllowed:false,writeAuthorized:false});
}
