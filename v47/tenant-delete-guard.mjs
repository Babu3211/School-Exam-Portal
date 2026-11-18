import {assertSchoolId,assertDocumentId} from './school-scope.mjs';
export function prepareDelete({schoolId,collection,id,firstConfirmation,secondConfirmation}){
 assertSchoolId(schoolId);assertDocumentId(id);
 if(!['students','staff','subjects','exams'].includes(collection))throw new TypeError('Deletion category not approved');
 if(firstConfirmation!==true||secondConfirmation!==true)throw new Error('Two confirmations required');
 return {schoolId,collection,id,requiresServerAuthorization:true};
}
