import {assertIemisSchoolId} from './iemis-school-identity.mjs';
export const COLLECTIONS = Object.freeze(['students','staff','classes','subjects','subject_assignments','teacher_assignments','component_marks','exams','marks','attendance','mark_settings','school_settings','members']);
const COLON_IDS=new Set(['marks','component_marks','teacher_assignments','subject_assignments']);
export function validateSchoolId(id){return assertIemisSchoolId(id);}
export function schoolCollectionPath(id,name){validateSchoolId(id);if(!COLLECTIONS.includes(name))throw new Error('Unsupported collection');return 'schools/'+id+'/'+name;}
export function schoolDocumentPath(id,name,docId){
 const base=schoolCollectionPath(id,name);
 const pattern=COLON_IDS.has(name)?/^[a-zA-Z0-9_:-]{1,384}$/:/^[a-zA-Z0-9_-]{1,128}$/;
 if(typeof docId!=='string'||!pattern.test(docId)||docId.includes('::'))throw new Error('Invalid document ID');
 return base+'/'+docId;
}
