import {tenantDocument} from './tenant-paths.mjs';
export function auditDocument(schoolId,eventId){return tenantDocument(schoolId,'audit_logs',eventId);}
