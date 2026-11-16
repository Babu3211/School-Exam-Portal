/**
 * Strict, read-only V47 school-scoped IEMIS ledger renderer.
 * Caller must supply records fetched through a verified tenant read session.
 * Never interprets V47 percentage-only marks as V46 assessment components.
 */
import {iemisLedger,iemisSubjectKey} from "../../iemis-ledger.js";
import {assertSchoolId} from "./tenant-domain.mjs";
import {toV46IemisTerm} from "./v46-exam-term-adapter.mjs";
export function renderV47SchoolLedger({schoolId,term,classNo,schoolName,schoolCode,students,subjects,marks,examId,mode="number",creditFor,componentsFor,applicable}){
 assertSchoolId(schoolId);
 const n=Number(classNo);
 if(!Number.isInteger(n)||n<1||n>10)throw new Error("IEMIS ledger format not verified for this class");
 if(!["number","grade","entry"].includes(mode))throw new Error("Unsupported ledger mode");
 const annual=toV46IemisTerm(term)==="annual";
 if(typeof examId!=="string"||!examId.trim())throw new Error("Exam ID required");
 if(!Array.isArray(students)||!Array.isArray(subjects)||!Array.isArray(marks))throw new TypeError("Ledger data arrays required");
 if(!students.length||!subjects.length)throw new Error("Complete student and subject lists required");
 const studentIds=new Set();
 for(const st of students){
  if(!st||typeof st!=="object"||typeof st.id!=="string"||!st.id||studentIds.has(st.id))
   throw new Error("Invalid or duplicate student identity");
  studentIds.add(st.id);
 }
 const compatible=[];
 const seenMarkKeys=new Set();
 const subjectKeys=new Set(subjects.map(subject=>iemisSubjectKey(subject)));
 if(subjectKeys.has("")||subjectKeys.size!==subjects.length)throw new Error("Invalid or duplicate ledger subjects");
 for(const mark of marks){
  if(!mark||typeof mark!=="object"||mark.examId!==examId)continue;
  if(!studentIds.has(mark.studentId))throw new Error("Ledger contains a mark outside selected students");
  if(!Array.isArray(mark.scores)||!mark.scores.length)
   throw new Error("V47 percentage-only marks cannot be used in an IEMIS ledger");
  const subjectKey=iemisSubjectKey(mark.subject);
  if(!subjectKeys.has(subjectKey))throw new Error("Ledger mark subject is not in selected subjects");
  const uniqueKey=mark.studentId+"|"+subjectKey;
  if(seenMarkKeys.has(uniqueKey))throw new Error("Duplicate ledger mark for student and subject");
  seenMarkKeys.add(uniqueKey);
  if(mark.classNo!==undefined&&Number(mark.classNo)!==n)
   throw new Error("Ledger mark class mismatch");
  compatible.push(mark);
 }
 if(typeof creditFor!=="function"||typeof componentsFor!=="function"||typeof applicable!=="function")
  throw new Error("Verified subject credit, component and applicability mappings required");
 const ledger=iemisLedger({mode,classNo:n,annual,subjects,students,records:compatible,examId,schoolName:String(schoolName??""),schoolCode:String(schoolCode??""),creditFor,componentsFor,applicable});
 // V46 returns separate header/body fragments, not a ready-made HTML string.
 return Object.freeze({head:ledger.head,body:ledger.body,subjects:Object.freeze([...ledger.subjects])});
}
