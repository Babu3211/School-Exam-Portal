import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validateSubjectAssignment,subjectAssignmentId} from './assignment-validation.mjs';
export async function createSubjectAssignment({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);if(!canAccessSchool(actor,schoolId,'write')||actor?.role!=='school_admin')throw new Error('School Admin required');
 const assignment=validateSubjectAssignment(input),id=subjectAssignmentId(assignment);
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing transaction SDK');
 const ref=(collection,key)=>api.doc(db,'schools',schoolId,collection,key);
 await api.runTransaction(db,async tx=>{
  const [student,subject,existing]=await Promise.all([tx.get(ref('students',assignment.studentId)),tx.get(ref('subjects',assignment.subjectId)),tx.get(ref('subject_assignments',id))]);
  if(!student.exists()||student.data().class!==assignment.class)throw new Error('Student missing or wrong class');
  if(!subject.exists()||subject.data().class!==assignment.class||subject.data().active!==true)throw new Error('Subject missing, inactive or wrong class');
  if(existing.exists())throw new Error('Assignment already exists');
  tx.set(ref('subject_assignments',id),assignment);
 });return Object.freeze({id,...assignment});
}
