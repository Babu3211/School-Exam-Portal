import {tenantDocument} from './tenant-paths.mjs';
export function studentDocument(schoolId,studentId){return tenantDocument(schoolId,'students',studentId);}
export function markDocument(schoolId,markId){return tenantDocument(schoolId,'marks',markId);}
export function attendanceDocument(schoolId,attendanceId){return tenantDocument(schoolId,'attendance',attendanceId);}
export function staffDocument(schoolId,staffId){return tenantDocument(schoolId,'staff',staffId);}
