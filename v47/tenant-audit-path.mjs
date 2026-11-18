// Audit logs are server-managed. Firestore rules intentionally deny client access.
import {schoolDocumentPath} from './school-scope.mjs';
export function auditDocument(schoolId,eventId){return schoolDocumentPath(schoolId,'audit_logs',eventId);}
