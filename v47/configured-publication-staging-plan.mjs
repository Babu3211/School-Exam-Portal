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

/**
 * Rebuild a staging manifest from authoritative server-reloaded inputs and
 * compare every field before accepting it for *review*. This does not grant
 * write permission or validate the caller's authentication.
 */
export function verifyConfiguredPublicationStagingPlan({plan,...authoritativeInput}) {
 if(!plan||typeof plan!=='object'||Array.isArray(plan))throw new Error('Staging plan required');
 const expected=planConfiguredPublicationStaging(authoritativeInput);
 if(JSON.stringify(plan)!==JSON.stringify(expected))throw new Error('Staging plan differs from authoritative class snapshot');
 return Object.freeze({
  valid:true,
  schoolId:expected.schoolId,
  rosterCount:expected.rosterCount,
  batchCount:expected.batches.length,
  writeAuthorized:false,
  publicationAllowed:false
 });
}
