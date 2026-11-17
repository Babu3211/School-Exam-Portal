import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validateSubjectAssignment,subjectAssignmentId} from './subject-assignment-validation.mjs';
// Create-only student-to-subject relationship; no grade policy is inferred.
export async function createSubjectAssignment({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const a=validateSubjectAssignment(input),id=subjectAssignmentId(a);
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firestore transaction SDK');
 const base=['schools',schoolId];
 const studentRef=api.doc(db,...base,'students',a.studentId),subjectRef=api.doc(db,...base,'subjects',a.subjectId),assignmentRef=api.doc(db,...base,'subject_assignments',id);
 await api.runTransaction(db,async tx=>{
  const [student,subject,existing]=await Promise.all([tx.get(studentRef),tx.get(subjectRef),tx.get(assignmentRef)]);
  if(!student.exists()||student.data().class!==a.class)throw new Error('Student class mismatch');
  if(!subject.exists()||subject.data().class!==a.class||subject.data().active!==true)throw new Error('Subject inactive or class mismatch');
  if(existing.exists())throw new Error('Assignment already exists');
  tx.set(assignmentRef,a);
 });
 return Object.freeze({id,...a});
}
