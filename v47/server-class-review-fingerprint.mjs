import {createHash} from 'node:crypto';
import {planConfiguredPublicationStaging} from './configured-publication-staging-plan.mjs';

// Server-side review fingerprint only. This module cannot authorize or perform writes.
// Caller must independently authenticate and reload all authoritative tenant records.
export function fingerprintConfiguredClassReview({settingsRevision,rosterRevision,...input}){
 for(const [name,value] of [['settingsRevision',settingsRevision],['rosterRevision',rosterRevision]]){
  if(typeof value!=='string'||!/^[A-Za-z0-9_.:-]{1,128}$/.test(value))throw new Error('Authoritative '+name+' required');
 }
 const plan=planConfiguredPublicationStaging(input);
 const canonical={
  format:'smss-v47-class-review-digest-v1',
  schoolId:plan.schoolId,classId:plan.classId,subjectId:plan.subjectId,examId:plan.examId,
  settingsRevision,rosterRevision,rosterCount:plan.rosterCount,
  components:plan.componentLimits.map(c=>({key:c.key,name:c.name,fullMarks:c.fullMarks})),
  entries:plan.batches.flatMap(b=>b.entries.map(e=>({
   studentId:e.studentId,isAbsent:e.isAbsent,
   values:e.isAbsent?null:Object.fromEntries(plan.componentLimits.map(c=>[c.key,e.values[c.key]])),
   totalObtained:e.totalObtained
  })))
 };
 if(canonical.entries.length!==plan.rosterCount)throw new Error('Review roster mismatch');
 const bytes=Buffer.from(JSON.stringify(canonical),'utf8');
 if(bytes.byteLength>2_000_000)throw new Error('Review snapshot too large');
 const digest=createHash('sha256').update(bytes).digest('hex');
 return Object.freeze({
  format:canonical.format,schoolId:plan.schoolId,classId:plan.classId,
  subjectId:plan.subjectId,examId:plan.examId,rosterCount:plan.rosterCount,
  settingsRevision,rosterRevision,digestAlgorithm:'sha256',digest,
  writeAuthorized:false,publicationAllowed:false
 });
}
