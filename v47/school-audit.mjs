import {assertSchoolId,assertDocumentId} from './school-scope.mjs';
export function auditEvent({schoolId,actorUid,action,entity,entityId}){
 assertSchoolId(schoolId);assertDocumentId(actorUid);assertDocumentId(entityId);
 if(!['create','update','delete','login','role-change'].includes(action))throw new TypeError('Invalid action');
 if(typeof entity!=='string'||!/^[a-z_]{2,64}$/.test(entity))throw new TypeError('Invalid entity');
 return {schoolId,actorUid,action,entity,entityId};
}
