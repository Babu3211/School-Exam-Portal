/**
 * Connect verified school-scoped Firestore reads to the unchanged V46 ledger.
 * No writes, no inferred subject mappings and no partial-collection results.
 */
import {loadV47LedgerCollections} from "./v46-ledger-data-loader.mjs";
import {renderV47SchoolLedger} from "./v46-school-ledger-adapter.mjs";
export async function prepareV47SchoolLedger({session,schoolId,term,classNo,examId,schoolName,schoolCode,mode="number",selectStudents,selectSubjects,selectMarks,creditFor,componentsFor,applicable,pageSize=50,maxRecordsPerCollection=5000}){
 if(typeof selectStudents!=="function"||typeof selectSubjects!=="function"||typeof selectMarks!=="function")
  throw new TypeError("Explicit verified class/subject/mark selectors required");
 const data=await loadV47LedgerCollections({session,pageSize,maxRecordsPerCollection});
 if(!data.exams.some(exam=>exam.id===examId))
  throw new Error("Selected exam does not exist in this school");
 const students=selectStudents(data.students,classNo);
 const subjects=selectSubjects(data.subjects,classNo,examId);
 const marks=selectMarks(data.marks,classNo,examId);
 if(!Array.isArray(students)||!Array.isArray(subjects)||!Array.isArray(marks))
  throw new Error("Ledger selectors must return arrays");
 if(!marks.length)throw new Error("No compatible marks selected for this exam");
 return renderV47SchoolLedger({schoolId,term,classNo,examId,schoolName,schoolCode,mode,students,subjects,marks,creditFor,componentsFor,applicable});
}
