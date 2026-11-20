// V47-only helpers. Never import into V46 production without an approved migration.
import {assertIemisSchoolId} from './iemis-school-identity.mjs';
const DOC_ID_PATTERN=/^[A-Za-z0-9_-]{1,128}$/;
const COLLECTION_PATTERN=/^[A-Za-z][A-Za-z0-9_]{0,63}$/;
export function assertSchoolId(id){
 return assertIemisSchoolId(id);
}
export function assertDocumentId(id){
 if(typeof id!=='string'||!DOC_ID_PATTERN.test(id))throw new TypeError('Invalid document ID');
 return id;
}
export function schoolCollectionPath(schoolId,collection){
 assertSchoolId(schoolId);
 if(typeof collection!=='string'||!COLLECTION_PATTERN.test(collection))throw new TypeError('Invalid collection');
 return 'schools/'+schoolId+'/'+collection;
}
export function schoolDocumentPath(schoolId,collection,documentId){
 return schoolCollectionPath(schoolId,collection)+'/'+assertDocumentId(documentId);
}
export function schoolMembershipPath(schoolId,uid){
 return schoolDocumentPath(schoolId,'members',uid);
}
