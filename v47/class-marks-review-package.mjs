import {prepareConfiguredClassPublication} from './configured-class-publication-preview.mjs';

// Exportable, deterministic and read-only review package. This does not write
// Firestore or authorize grade publication. It preserves all 1–1500 students.
export function buildClassMarksReviewPackage(input){
 const proposal=prepareConfiguredClassPublication(input);
 if(!proposal.complete)throw new Error('All student marks must be complete before review export');
 const {schoolId,classId,subjectId,examId}=proposal;
 const payload={
  format:'smss-v47-class-mark-review-v1',
  schoolId,classId,subjectId,examId,
  rosterCount:proposal.rosterCount,
  componentLimits:proposal.componentLimits.map(c=>({key:c.key,name:c.name,fullMarks:c.fullMarks})),
  entries:proposal.orderedEntries.map(row=>({
   studentId:row.studentId,
   isAbsent:row.isAbsent,
   values:row.isAbsent?null:Object.fromEntries(proposal.componentLimits.map(c=>[c.key,row.values[c.key]])),
   totalObtained:row.totalObtained
  })),
  writeAuthorized:false,
  publicationAllowed:false
 };
 const json=JSON.stringify(payload);
 // Deliberately bounded: no unbounded downloads and no implicit Firestore write.
 if(new TextEncoder().encode(json).length>900000)throw new Error('Review package exceeds safe size limit');
 return Object.freeze({filename:'smss-v47-review-'+schoolId+'-'+classId+'-'+subjectId+'-'+examId+'.json',json,rosterCount:proposal.rosterCount,writeAuthorized:false,publicationAllowed:false});
}
