// Diagnostic-only fail-closed gate. Missing/invalid marks are reportable, but broken rosters are not.
const REPORTABLE_ISSUES=new Set(['missing_raw_mark','missing_computer_components','invalid_raw_mark_scores','invalid_component_score','component_score_out_of_range']);
export function assertLedgerReviewExportable(preview){
 if(!preview||preview.officialLedger!==false||preview.publishable!==false||preview.gradeCalculated!==false||preview.iemisPolicyVerified!==false)throw new Error('Official results cannot be exported through diagnostic review');
 if(!Array.isArray(preview.issues)||!preview.summary||!Array.isArray(preview.invalidOrMissingDetails))throw new Error('Invalid diagnostic preview');
 if(preview.issues.includes('pagination_incomplete'))throw new Error('incomplete review cannot be exported');
 if(!Number.isInteger(preview.summary.students)||preview.summary.students<1||!Number.isInteger(preview.summary.subjects)||preview.summary.subjects<1||!Number.isInteger(preview.summary.assignedPairs)||preview.summary.assignedPairs<1)throw new Error('Empty or unassigned school roster cannot be exported');
 if(preview.summary.invalidOrMissingPairs!==preview.invalidOrMissingDetails.length)throw new Error('exception count mismatch');
 if(!Number.isInteger(preview.summary.validMarkedPairs)||!Number.isInteger(preview.summary.markedPairs)||preview.summary.validMarkedPairs<0||preview.summary.markedPairs<preview.summary.validMarkedPairs||preview.summary.assignedPairs<preview.summary.validMarkedPairs)throw new Error('Invalid mark coverage totals');
 if(preview.invalidOrMissingDetails.some(entry=>!entry||!['missing_mark','invalid_score_or_format'].includes(entry.reason)||typeof entry.studentId!=='string'||!entry.studentId||typeof entry.subjectId!=='string'||!entry.subjectId))throw new Error('Invalid exception identity or reason');
 const exceptionKeys=new Set(preview.invalidOrMissingDetails.map(entry=>JSON.stringify([entry.studentId,entry.subjectId])));
 if(exceptionKeys.size!==preview.invalidOrMissingDetails.length)throw new Error('Duplicate diagnostic exception');
 if(!Number.isInteger(preview.summary.invalidOrMissingPairs)||preview.summary.invalidOrMissingPairs<0||preview.summary.invalidOrMissingPairs>preview.summary.assignedPairs||preview.summary.validMarkedPairs+preview.summary.invalidOrMissingPairs!==preview.summary.assignedPairs)throw new Error('Inconsistent assignment coverage totals');
 if(!Number.isInteger(preview.summary.missingPairs)||preview.summary.missingPairs<0||preview.summary.missingPairs>preview.summary.invalidOrMissingPairs||preview.summary.missingPairs!==preview.summary.assignedPairs-preview.summary.markedPairs)throw new Error('Inconsistent missing mark totals');
 const blockers=preview.issues.filter(issue=>!REPORTABLE_ISSUES.has(issue));
 if(blockers.length)throw new Error('Unresolved school data integrity issues: '+[...new Set(blockers)].join(', '));
 return true;
}
