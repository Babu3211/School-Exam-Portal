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
 // Selectors may filter, but must not fabricate or alter verified records.
 const studentSource=new Set(data.students);
 const markSource=new Set(data.marks);
 const subjectNames=new Set(data.subjects.map(s=>String(s.name??"")));
 if(students.some(s=>!studentSource.has(s)||Number(s.classNo??s.classId)!==Number(classNo)))
  throw new Error("Student selection is not from the verified school/class");
 if(subjects.some(s=>typeof s!=="string"||!subjectNames.has(s)))
  throw new Error("Subject selection is not from verified school subjects");
 if(marks.some(m=>!markSource.has(m)||m.examId!==examId||Number(m.classNo??m.classId)!==Number(classNo)))
  throw new Error("Mark selection is not from the verified school exam/class");
 const selectedIds=new Set(students.map(s=>s.id));
 if(marks.some(m=>!selectedIds.has(m.studentId)))
  throw new Error("Selected mark belongs to a student outside this class");
 return renderV47SchoolLedger({schoolId,term,classNo,examId,schoolName,schoolCode,mode,students,subjects,marks,creditFor,componentsFor,applicable});
}
