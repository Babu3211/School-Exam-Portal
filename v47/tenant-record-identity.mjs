import {assertSchoolId,assertDocumentId} from './school-scope.mjs';
export function assertImmutableTenantIdentity(before,after){
 if(!before||!after||typeof before!=='object'||typeof after!=='object')throw new TypeError('Records required');
 assertSchoolId(before.schoolId);assertDocumentId(before.studentId);
 if(before.schoolId!==after.schoolId||before.studentId!==after.studentId)throw new Error('Immutable tenant identity changed');
 return true;
}
