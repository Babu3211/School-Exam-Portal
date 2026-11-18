import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validateMarkEntry,markEntryId} from './marks-service.mjs';
// Transactionally create a raw mark; never overwrite an existing record.
export async function createSchoolMarkOnly({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);
 const isAdmin=canAccessSchool(actor,schoolId,'write');
 const isTeacher=actor?.active===true&&actor.role==='teacher'&&actor.schoolId===schoolId&&typeof actor.uid==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid);
 if(!isAdmin&&!isTeacher)throw new Error('School Admin or assigned Teacher permission required');
 const entry=validateMarkEntry(input),id=markEntryId(entry);
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firestore transaction methods');
 const markRef=api.doc(db,'schools',schoolId,'marks',id);
 const studentRef=api.doc(db,'schools',schoolId,'students',entry.studentId);
 const subjectRef=api.doc(db,'schools',schoolId,'subjects',entry.subjectId);
 const assignmentRef=api.doc(db,'schools',schoolId,'subject_assignments',entry.studentId+':'+entry.subjectId);
 const componentRef=api.doc(db,'schools',schoolId,'component_marks',id);
 const teacherRef=isTeacher?api.doc(db,'schools',schoolId,'teacher_assignments',schoolId+':'+actor.uid+':'+entry.class+':'+entry.subjectId):null;
 await api.runTransaction(db,async tx=>{
  // All reads precede the write, so concurrent roster/subject changes retry the transaction.
  const [student,subject,assignment,existing,component,teacherAssignment]=await Promise.all([tx.get(studentRef),tx.get(subjectRef),tx.get(assignmentRef),tx.get(markRef),tx.get(componentRef),teacherRef?tx.get(teacherRef):Promise.resolve(null)]);
  if(!student.exists()||student.data().class!==entry.class)throw new Error('Student missing or in another class');
  if(!subject.exists()||subject.data().active!==true||subject.data().class!==entry.class)throw new Error('Subject missing, inactive or in another class');
  if(['9','10'].includes(entry.class)&&subject.data().name==='Computer')throw new Error('Use Computer 4/36/10 component marks entry');
 if(!assignment.exists()||assignment.data().studentId!==entry.studentId||assignment.data().subjectId!==entry.subjectId||assignment.data().class!==entry.class)throw new Error('Student subject assignment required');
  if(isTeacher&&(!teacherAssignment?.exists()||teacherAssignment.data().active!==true||teacherAssignment.data().schoolId!==schoolId||teacherAssignment.data().uid!==actor.uid||teacherAssignment.data().classId!==entry.class||teacherAssignment.data().subjectId!==entry.subjectId))throw new Error('Active teacher class/subject assignment required');
  if(existing.exists()||component.exists())throw new Error('Mark already exists; overwrite blocked');
  tx.set(markRef,{...entry,schoolId});
 });
 return {id,...entry};
}
