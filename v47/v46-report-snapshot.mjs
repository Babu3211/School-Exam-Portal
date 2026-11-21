import {assertIemisSchoolId} from './iemis-school-identity.mjs';
// V47-only conversion of verified school-scoped Firestore snapshots into V46 report rows.
// Preserve V46 record fields and document IDs; do not calculate grades or publish results.
const REQUIRED=Object.freeze(['students','subjects','exams','marks','markSettings']);
export function prepareV46ReportSnapshot(inputs){
 if(!inputs)throw new Error('Verified IEMIS school ID required');
 assertIemisSchoolId(inputs.schoolId);
 const out={schoolId:inputs.schoolId};
 for(const key of REQUIRED){
  const snapshot=inputs[key];
  if(!snapshot||!Array.isArray(snapshot.docs))throw new Error('Incomplete V46 report snapshot: '+key);
  const ids=new Set();
  out[key]=Object.freeze(snapshot.docs.map(doc=>{
   if(!doc||typeof doc.id!=='string'||!doc.id||typeof doc.data!=='function')throw new Error('Invalid V46 report document: '+key);
   if(ids.has(doc.id))throw new Error('Duplicate V46 report document: '+key+'/'+doc.id);
   ids.add(doc.id);
   const data=doc.data();
   if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid V46 report record: '+key+'/'+doc.id);
   if(Object.hasOwn(data,'schoolId')&&data.schoolId!==inputs.schoolId)throw new Error('Cross-school V46 report record: '+key+'/'+doc.id);
   if(Object.hasOwn(data,'school_id')&&data.school_id!==inputs.schoolId)throw new Error('Cross-school V46 report record: '+key+'/'+doc.id);
   return Object.freeze({...data,id:doc.id});
  }));
 }
 return Object.freeze(out);
}
