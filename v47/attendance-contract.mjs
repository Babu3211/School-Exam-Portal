import {assertSchoolId,assertDocumentId} from './school-scope.mjs';
export function validateAttendanceRecord({schoolId,studentId,date,status}){
 assertSchoolId(schoolId);assertDocumentId(studentId);
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new TypeError('Invalid ISO date');
 if(!['present','absent','late','leave'].includes(status))throw new TypeError('Invalid attendance status');
 return {schoolId,studentId,date,status};
}
