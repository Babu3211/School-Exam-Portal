// V47 non-official complete-class draft document. One bounded document per
// class/subject/exam; this is NOT a grade, publication, result or CDC certificate.
// Only settings-verified roster-complete rows are persisted. The one-document
// strategy avoids a partial student-by-student draft write.
import {validateSchoolId} from './school-paths.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
import {inspectConfiguredClassMarks} from './configured-mark-preflight.mjs';
export const CLASS_DRAFT_MAX_BYTES=700000;
export const CLASS_DRAFT_FORMAT='smss-v47-complete-class-draft-v1';
const safeId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
export function completeClassDraftId({classId,subjectId,examId}){
 if(!validSchoolClass(classId)||!safeId(subjectId))throw Error('Invalid class or subject for draft');
 validateExamTerm(examId);
 const result=classId+'_'+subjectId+'_'+examId;
 if(result.length>128)throw Error('Draft document ID exceeds Firestore safety limit');
 return result;
}
export function prepareCompleteClassDraft({actor,schoolId,classId,subjectId,examId,settings,expectedStudentIds,drafts,expectedRevision=0}){
 validateSchoolId(schoolId);
 if(!actor||actor.active!==true||actor.role!=='school_admin'||actor.schoolId!==schoolId||
    !safeId(actor.uid))throw Error('School Admin required for complete-class draft');
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||expectedRevision>1000000000)
  throw Error('Invalid expected draft revision');
 const docId=completeClassDraftId({classId,subjectId,examId});
 if(settings?.settingsId!==docId)throw Error('Verified Examination Settings ID does not match selected class/subject/term');
 const checked=inspectConfiguredClassMarks({schoolId,classId,subjectId,examId,settings,expectedStudentIds,drafts});
 if(!checked.complete)throw Error('Complete class draft required: '+checked.missing.length+' missing, '+checked.invalid.length+' invalid');
 const entries=checked.ready.map(row=>({
  studentId:row.studentId,isAbsent:row.isAbsent,
  values:row.isAbsent?null:{...row.values},
  totalObtained:row.totalObtained
 })).sort((a,b)=>a.studentId<b.studentId?-1:a.studentId>b.studentId?1:0);
 const data={
  format:CLASS_DRAFT_FORMAT,state:'draft',
  schoolId,classId,subjectId,examId,settingsId:docId,
  rosterCount:checked.rosterCount,revision:expectedRevision+1,
  updatedBy:actor.uid,entries
 };
 // Reserve substantial headroom below Firestore's 1 MiB document limit.
 const bytes=new TextEncoder().encode(JSON.stringify(data)).length;
 if(bytes>CLASS_DRAFT_MAX_BYTES)throw new RangeError('Complete class draft exceeds safe Firestore document size; nothing saved');
 return Object.freeze({docId,data:Object.freeze(data),bytes,expectedRevision,
  rosterCount:checked.rosterCount,writeAuthorized:false,publicationAllowed:false,
  warning:'Private complete-class DRAFT only. Publication and official marks remain disabled.'});
}
