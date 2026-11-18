export const COLLECTIONS = Object.freeze(['students','staff','classes','subjects','subject_assignments','teacher_assignments','component_marks','exams','marks','attendance','mark_settings','school_settings','members']);
export function validateSchoolId(id){if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{3,64}$/.test(id))throw new Error('Invalid school ID');return id;}
export function schoolCollectionPath(id,name){validateSchoolId(id);if(!COLLECTIONS.includes(name))throw new Error('Unsupported collection');return 'schools/'+id+'/'+name;}
export function schoolDocumentPath(id,name,docId){const base=schoolCollectionPath(id,name);if(typeof docId!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(docId))throw new Error('Invalid document ID');return base+'/'+docId;}
