/**
 * Connect verified school-scoped Firestore reads to the unchanged V46 ledger.
 * No writes, no inferred subject mappings and no partial-collection results.
 */
import {loadV47LedgerCollections} from "./v46-ledger-data-loader.mjs";
import {renderV47SchoolLedger} from "./v46-school-ledger-adapter.mjs";
import {toV46IemisTerm} from "./v46-exam-term-adapter.mjs";
import {iemisSubjectKey} from "../../iemis-ledger.js";
export async function prepareV47SchoolLedger({session,schoolId,term,classNo,examId,schoolName,schoolCode,mode="number",selectStudents,selectSubjects,selectMarks,creditFor,componentsFor,applicable,pageSize=50,maxRecordsPerCollection=5000}){
 if(typeof selectStudents!=="function"||typeof selectSubjects!=="function"||typeof selectMarks!=="function")
  throw new TypeError("Explicit verified class/subject/mark selectors required");
 const data=await loadV47LedgerCollections({session,pageSize,maxRecordsPerCollection});
 const selectedExam=data.exams.find(exam=>exam.id===examId);
 if(!selectedExam)throw new Error("Selected exam does not exist in this school");
 if(selectedExam.schoolId!==schoolId)throw new Error("Selected exam school mismatch");
 // An exam explicitly tagged with class/term must match the requested ledger.
 if(selectedExam.classNo!=null && Number(selectedExam.classNo)!==Number(classNo))
  throw new Error("Selected exam class mismatch");
 const requestedLegacyTerm=toV46IemisTerm(term);
 if(selectedExam.term!=null && selectedExam.term!==term && selectedExam.term!==requestedLegacyTerm)
  throw new Error("Selected exam term mismatch");
 const students=selectStudents(data.students,classNo);
 const subjects=selectSubjects(data.subjects,classNo,examId);
 const marks=selectMarks(data.marks,classNo,examId);
 if(!Array.isArray(students)||!Array.isArray(subjects)||!Array.isArray(marks))
  throw new Error("Ledger selectors must return arrays");
 if(!marks.length)throw new Error("No compatible marks selected for this exam");
 // Selectors may filter, but must not fabricate or alter verified records.
 const studentSource=new Set(data.students);
 const markSource=new Set(data.marks);
 const verifiedSubjects=data.subjects.filter(s=>(s.classNo??s.classId)==null||Number(s.classNo??s.classId)===Number(classNo));
 const subjectNames=new Set(verifiedSubjects.filter(s=>s.schoolId===schoolId).flatMap(s=>[s.name,s.subjectName].filter(Boolean).map(String)));
 if(students.some(s=>!studentSource.has(s)||Number(s.classNo??s.classId)!==Number(classNo)))
  throw new Error("Student selection is not from the verified school/class");
 if(subjects.some(s=>typeof s!=="string"||!subjectNames.has(s)))
  throw new Error("Subject selection is not from verified school subjects");
 const normalizedSelected=new Set(subjects.map(iemisSubjectKey));
 if(normalizedSelected.has("")||normalizedSelected.size!==subjects.length)
  throw new Error("Duplicate or invalid selected ledger subjects");
 for(const subject of subjects){
  const matches=verifiedSubjects.filter(s=>(s.schoolId==null||s.schoolId===schoolId)&&[s.name,s.subjectName].some(name=>name===subject));
  if(matches.length!==1)throw new Error("Ambiguous selected ledger subject mapping");
 }
 if(marks.some(m=>!markSource.has(m)||m.examId!==examId||Number(m.classNo??m.classId)!==Number(classNo)))
  throw new Error("Mark selection is not from the verified school exam/class");
 const expectedMarks=data.marks.filter(m=>m.examId===examId&&Number(m.classNo??m.classId)===Number(classNo));
 const selectedMarkSet=new Set(marks);
 if(expectedMarks.some(m=>!selectedMarkSet.has(m))||selectedMarkSet.size!==marks.length)
  throw new Error("Incomplete or duplicate ledger marks selection");
 const expectedStudents=data.students.filter(s=>Number(s.classNo??s.classId)===Number(classNo));
 const selectedStudentSet=new Set(students);
 if(expectedStudents.some(s=>!selectedStudentSet.has(s))||selectedStudentSet.size!==students.length)
  throw new Error("Incomplete or duplicate ledger students selection");
 const selectedIds=new Set(students.map(s=>s.id));
 if(marks.some(m=>!selectedIds.has(m.studentId)))
  throw new Error("Selected mark belongs to a student outside this class");
 return renderV47SchoolLedger({schoolId,term,classNo,examId,schoolName,schoolCode,mode,students,subjects,marks,creditFor,componentsFor,applicable});
}
