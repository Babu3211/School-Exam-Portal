import {prepareConfiguredClassPublication} from './configured-class-publication-preview.mjs';

// Deterministic, read-only staging manifest for a future trusted-server executor.
// No Firestore client, writes, publication pointer or approval is exposed here.
export function planConfiguredPublicationStaging(input) {
 const preview=prepareConfiguredClassPublication(input);
 if(!preview.complete)throw new Error('Complete verified class review required before staging plan');
 const {schoolId,classId,subjectId,examId}=preview;
 const batches=preview.reviewBatches.map((rows,index)=>{
  const entries=rows.map(row=>Object.freeze({
   studentId:row.studentId,
   isAbsent:row.isAbsent,
   values:row.isAbsent?null:Object.freeze({...row.values}),
   totalObtained:row.totalObtained
  }));
  return Object.freeze({
   index,
   firstStudentId:entries[0].studentId,
   lastStudentId:entries.at(-1).studentId,
   count:entries.length,
   entries:Object.freeze(entries)
  });
 });
 if(batches.length>15||batches.some(batch=>batch.count<1||batch.count>100))throw new Error('Invalid bounded staging plan');
 if(batches.reduce((total,batch)=>total+batch.count,0)!==preview.rosterCount)throw new Error('Staging plan roster mismatch');
 return Object.freeze({
  format:'smss-v47-staging-plan-v1',
  schoolId,classId,subjectId,examId,
  rosterCount:preview.rosterCount,
  componentLimits:Object.freeze(preview.componentLimits.map(component=>Object.freeze({...component}))),
  batches:Object.freeze(batches),
  stagingOnly:true,
  writeAuthorized:false,
  publicationAllowed:false,
  warning:'READ-ONLY PLAN: no staging writes, official marks or publication pointer are created.'
 });
}
