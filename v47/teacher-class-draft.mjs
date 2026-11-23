// Complete but NOT official teacher mark draft. Each teacher uses a separate
// path; no admin draft, marks, ledger or result publication is touched.
import {validateSchoolId} from './school-paths.mjs';
import {completeClassDraftId,CLASS_DRAFT_MAX_BYTES} from './complete-class-draft-document.mjs';
import {inspectConfiguredClassMarks} from './configured-mark-preflight.mjs';

export const TEACHER_DRAFT_FORMAT='smss-v47-teacher-class-draft-v1';
const validUid=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id);
export function prepareTeacherClassDraft({actor,schoolId,classId,subjectId,examId,settings,expectedStudentIds,drafts,expectedRevision=0}){
 validateSchoolId(schoolId);
 if(actor?.role!=='teacher'||actor?.active!==true||actor?.schoolId!==schoolId||!validUid(actor.uid))
  throw Error('Active assigned Teacher required for draft');
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||expectedRevision>1000000000)
  throw Error('Invalid teacher draft revision');
 const docId=completeClassDraftId({classId,subjectId,examId});
 if(settings?.settingsId!==docId)throw Error('Verified Examination Settings required');
 const inspected=inspectConfiguredClassMarks({schoolId,classId,subjectId,examId,settings,expectedStudentIds,drafts});
 if(!inspected.complete)throw Error('Complete class marks required: '+inspected.missing.length+' missing, '+inspected.invalid.length+' invalid');
 const entries=inspected.ready.map(row=>({studentId:row.studentId,isAbsent:row.isAbsent,
  values:row.isAbsent?null:{...row.values},totalObtained:row.totalObtained
 })).sort((a,b)=>a.studentId.localeCompare(b.studentId,'en'));
 const data={format:TEACHER_DRAFT_FORMAT,state:'draft',schoolId,classId,subjectId,examId,
  settingsId:docId,rosterCount:inspected.rosterCount,revision:expectedRevision+1,
  updatedBy:actor.uid,entries};
 if(new TextEncoder().encode(JSON.stringify(data)).length>CLASS_DRAFT_MAX_BYTES)
  throw new RangeError('Teacher class draft exceeds safe Firestore document size');
 return Object.freeze({docId,data:Object.freeze(data),rosterCount:inspected.rosterCount,
  publicationAllowed:false,writeAuthorized:false});
}
