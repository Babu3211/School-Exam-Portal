import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
import {verifyClassMarksCoverage} from './class-marks-coverage.mjs';
// Read-only preflight. This does not authorize saving or publishing marks.
export function assessClassPublicationReadiness({actor,schoolId,schoolClass,term,students,subjects,records,coverage}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership required');
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 validateExamTerm(term);
 const blockers=[];
 if(!Array.isArray(students)||!students.length)blockers.push('Complete student roster unavailable');
 if(!Array.isArray(subjects)||!subjects.length)blockers.push('Complete subject roster unavailable');
 if(!Array.isArray(records))blockers.push('Marks records unavailable');
 if(!coverage?.complete)blockers.push('Full-class marks coverage not verified');
 if(Array.isArray(students)&&students.length&&Array.isArray(subjects)&&subjects.length&&Array.isArray(records)){
  try{
   const verified=verifyClassMarksCoverage({students,subjects,records,schoolClass,term});
   if(!coverage?.complete||coverage.studentCount!==verified.studentCount||coverage.subjectCount!==verified.subjectCount||coverage.recordCount!==verified.recordCount)blockers.push('Coverage metadata does not match verified marks');
  }catch(error){blockers.push('Full-class marks verification failed: '+error.message)}
 }
 if(Array.isArray(records)&&records.some(r=>r.schoolId!==schoolId))blockers.push('Marks contain foreign or unscoped school records');
 if(Array.isArray(students)&&students.some(s=>s.schoolId!==schoolId||s.class!==schoolClass||s.active!==true))blockers.push('Student roster contains inactive or foreign students');
 if(Array.isArray(subjects))for(const subject of subjects){
  if(subject.schoolId!==schoolId||subject.class!==schoolClass||subject.active!==true)blockers.push('Subject roster contains inactive or foreign subjects');
  if(typeof subject.creditHour!=='number'||!Number.isFinite(subject.creditHour)||subject.creditHour<=0||subject.creditHour>100)blockers.push('Missing credit hours: '+String(subject.id));
  if(Array.isArray(subject.components)&&subject.components.length)blockers.push('Component mapping not verified: '+String(subject.id));
 }
 if(term!=='final'||![6,7,8,9,10].includes(Number(schoolClass)))blockers.push('V46 diagnostic mapping not verified for this class and term');
 blockers.push('Firestore marks writes remain disabled pending emulator-tested complete-class publication');
 return Object.freeze({ready:false,diagnosticOnly:true,blockers:Object.freeze([...new Set(blockers)]),studentCount:Array.isArray(students)?students.length:null,subjectCount:Array.isArray(subjects)?subjects.length:null,markCount:Array.isArray(records)?records.length:null});
}
