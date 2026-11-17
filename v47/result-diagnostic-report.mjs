import {assessResultReadiness} from './result-readiness.mjs';
// Non-publishable diagnostic summary; never returns grades or GPA.
export function buildResultDiagnosticReport(input){
 if(!input||typeof input!=='object')throw new TypeError('Diagnostic input required');
 const result=assessResultReadiness(input);
 return Object.freeze({schoolClass:input.schoolClass,term:input.term,ready:false,publicationAllowed:false,students:result.students,subjects:result.subjects,marks:result.marks,expectedPairs:result.expectedPairs,checkedPairs:result.checkedPairs,blockers:Object.freeze([...result.blockers]),gradeLedgerAvailable:false,gradeSheetAvailable:false});
}
