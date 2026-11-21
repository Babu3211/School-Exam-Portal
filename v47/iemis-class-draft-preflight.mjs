import {iemisEntrySchema,iemisEntryValues} from './iemis-entry.js';
// Read-only full-roster preflight. Never writes to Firestore or publishes results.
export function inspectIemisClassDraft({classNo,term,subject,expectedStudentIds,drafts}){
 const schema=iemisEntrySchema(classNo,term,subject);
 if(!Array.isArray(expectedStudentIds)||expectedStudentIds.length===0||expectedStudentIds.length>1500||!Array.isArray(drafts)||drafts.length>1500)throw new Error('Complete authoritative class roster required');
 const expected=new Set();
 for(const id of expectedStudentIds){if(typeof id!=='string'||!id.trim()||expected.has(id))throw new Error('Invalid or duplicate roster student ID');expected.add(id)}
 const seen=new Set(),invalid=[],missing=[],ready=[];
 for(const row of drafts){
  if(!row||typeof row.studentId!=='string'||!expected.has(row.studentId)||seen.has(row.studentId))throw new Error('Duplicate or out-of-roster IEMIS draft');
  seen.add(row.studentId);
  try{
   const value=iemisEntryValues(schema,{values:row.values,isAbsent:row.isAbsent===true,incompatible:row.incompatible===true});
   if(value===null)missing.push(row.studentId);
   else ready.push(Object.freeze({studentId:row.studentId,assessmentType:value.assessmentType,totalFullMarks:value.totalFullMarks,totalObtained:value.totalObtained,isAbsent:value.isAbsent===true}));
  }catch(error){invalid.push(Object.freeze({studentId:row.studentId,message:error.message}))}
 }
 for(const id of expected)if(!seen.has(id))missing.push(id);
 return Object.freeze({classNo,term,subject,rosterCount:expected.size,complete:ready.length===expected.size&&missing.length===0&&invalid.length===0,ready:Object.freeze(ready),missing:Object.freeze(missing),invalid:Object.freeze(invalid),writeAuthorized:false,publicationAllowed:false});
}
