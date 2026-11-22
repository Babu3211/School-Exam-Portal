import {assessClassPublicationReadiness} from './class-publication-preflight.mjs';
import {loadCompleteSchoolSubjects} from './complete-school-subjects.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {loadAllClassMarks} from './complete-class-marks-query.mjs';
import {previewCompleteSchoolClass} from './complete-class-result-preview.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
// Read-only diagnostic orchestration. The caller must supply a verified, complete
// active subject roster; no results are persisted or certified for publication.
export async function loadSchoolClassResultDiagnostic({db,api,actor,schoolId,schoolClass,term,maxStudents=1500,maxRecords=30000}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership required');
 const identity={uid:actor?.uid,schoolId:actor?.schoolId,role:actor?.role,active:actor?.active};
 const check=()=>{if(actor?.uid!==identity.uid||actor?.schoolId!==identity.schoolId||actor?.role!==identity.role||actor?.active!==identity.active)throw new Error('School identity changed during diagnostic');};
 const subjectRoster=await loadCompleteSchoolSubjects({db,api,actor,schoolId,schoolClass});
 check();
 const subjects=subjectRoster.subjects;
 const roster=await loadCompleteClassRoster({db,api,actor,schoolId,classId:schoolClass,maxStudents});
 check();
 const marks=await loadAllClassMarks({db,api,actor,schoolId,schoolClass,term,maxRecords});
 check();
 // Do not silently convert inactive or unverified students to active.
 const students=roster.students;
 if(students.some(s=>s.active!==true||s.schoolId!==schoolId||s.class!==schoolClass))throw new Error('Roster includes inactive or foreign students');
 const preview=await previewCompleteSchoolClass({db,api,actor,schoolId,schoolClass,term,students,subjects,records:marks.records,hasMore:marks.hasMore});
 check();
 const publication=assessClassPublicationReadiness({actor,schoolId,schoolClass,term,students,subjects,records:marks.records,coverage:preview.coverage});
 check();
 return {...preview,publication,readPages:{subjects:subjectRoster.pages,students:roster.pages,marks:marks.pages},diagnosticOnly:true};
}
