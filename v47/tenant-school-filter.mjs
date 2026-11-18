import {assertSchoolId} from './school-scope.mjs';
export function requireTenantRecord(schoolId,record){
 assertSchoolId(schoolId);
 if(!record||typeof record!=='object'||Array.isArray(record)||record.schoolId!==schoolId)throw new Error('Record school mismatch');
 return record;
}
export function filterTenantRecords(schoolId,records){
 assertSchoolId(schoolId);
 if(!Array.isArray(records))throw new TypeError('Records required');
 return records.filter(x=>x?.schoolId===schoolId);
}
