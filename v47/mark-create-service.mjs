import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validateMarkEntry,markEntryId} from './marks-service.mjs';
// Transactionally create a raw mark; never overwrite an existing record.
export async function createSchoolMarkOnly({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const entry=validateMarkEntry(input),id=markEntryId(entry);
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firestore transaction methods');
 const markRef=api.doc(db,'schools',schoolId,'marks',id);
 const studentRef=api.doc(db,'schools',schoolId,'students',entry.studentId);
 const subjectRef=api.doc(db,'schools',schoolId,'subjects',entry.subjectId);
 const assignmentRef=api.doc(db,'schools',schoolId,'subject_assignments',entry.studentId+':'+entry.subjectId);
 await api.runTransaction(db,async tx=>{
  // All reads precede the write, so concurrent roster/subject changes retry the transaction.
  const [student,subject,assignment,existing]=await Promise.all([tx.get(studentRef),tx.get(subjectRef),tx.get(assignmentRef),tx.get(markRef)]);
  if(!student.exists()||student.data().class!==entry.class)throw new Error('Student missing or in another class');
  if(!subject.exists()||subject.data().active!==true||subject.data().class!==entry.class)throw new Error('Subject missing, inactive or in another class');
  if(!assignment.exists()||assignment.data().studentId!==entry.studentId||assignment.data().subjectId!==entry.subjectId||assignment.data().class!==entry.class)throw new Error('Student subject assignment required');
  if(existing.exists())throw new Error('Mark already exists; overwrite blocked');
  tx.set(markRef,entry);
 });
 return {id,...entry};
}
