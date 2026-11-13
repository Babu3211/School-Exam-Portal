/**
 * V46 batch attendance compatibility boundary. Pure and offline.
 * Preserves the V46 record shape (one class/date record with a students array).
 * Does not grant write permissions or touch live data.
 */
import {assertSchoolId} from "./tenant-domain.mjs";
import {schoolResourcePath} from "./school-data-paths.mjs";
const STATUSES=new Set(["present","absent","leave"]);
export function planV46AttendanceRecord({schoolId,record}) {
 assertSchoolId(schoolId);
 if(!record || typeof record!=="object" || Array.isArray(record)) throw new TypeError("Attendance record required");
 if(typeof record.date!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
    typeof record.className!=="string" || !record.className.trim() ||
    typeof record.attendanceType!=="string" || !record.attendanceType.trim())
   throw new TypeError("Invalid V46 attendance identity");
 if(!Array.isArray(record.students) || record.students.length>200) throw new TypeError("Invalid V46 attendance student list");
 const ids=new Set();
 for(const student of record.students) {
  if(!student || typeof student.studentId!=="string" || !student.studentId ||
     typeof student.studentName!=="string" || !student.studentName ||
     !STATUSES.has(student.status) || typeof student.remark!=="string" || student.remark.length>240 ||
     ids.has(student.studentId)) throw new TypeError("Invalid or duplicate V46 attendance student");
  ids.add(student.studentId);
 }
 const count=status=>record.students.filter(student=>student.status===status).length;
 if(record.totalStudents!==record.students.length ||
    record.presentCount!==count("present") ||
    record.absentCount!==count("absent") ||
    record.leaveCount!==count("leave"))
   throw new TypeError("V46 attendance totals mismatch");
 return Object.freeze({
  destinationCollection:schoolResourcePath(schoolId,"attendance"),
  sourceSchema:"v46-class-date-batch",
  preservesOriginalDocumentId:true,
  writeAuthorized:false,
  students:record.students.length,
  // Do not modify the payload; Firestore timestamps and nested fields must survive migration.
  data:record
 });
}
