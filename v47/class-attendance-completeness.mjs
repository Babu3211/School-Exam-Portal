import {validateSchoolId} from './school-paths.mjs';
import {validateAttendance} from './attendance-service.mjs';

// Fail closed when a teacher/admin has not loaded the full school/class roster.
export function validateCompleteClassAttendance({schoolId,classId,date,expectedStudentIds,entries}){
 validateSchoolId(schoolId);
 if(!Array.isArray(expectedStudentIds)||expectedStudentIds.length===0||expectedStudentIds.length>1500)throw new Error('Valid class roster required');
 if(!Array.isArray(entries)||entries.length>1500)throw new Error('Valid attendance entries required');
 const expected=new Set();
 for(const id of expectedStudentIds){
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(id)||expected.has(id))throw new Error('Invalid or duplicate roster ID');
  expected.add(id);
 }
 const seen=new Set(),validated=[];
 for(const item of entries){
  const entry=validateAttendance(item);
  if(entry.class!==classId||entry.date!==date)throw new Error('Mixed class or attendance date');
  if(!expected.has(entry.studentId))throw new Error('Student not in selected class');
  if(seen.has(entry.studentId))throw new Error('Duplicate student attendance');
  seen.add(entry.studentId);
  validated.push(entry);
 }
 if(seen.size!==expected.size)throw new Error('Attendance incomplete: '+(expected.size-seen.size)+' students missing');
 return {schoolId,classId,date,count:validated.length,entries:validated};
}
