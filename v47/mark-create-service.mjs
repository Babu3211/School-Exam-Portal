import {validateSchoolId} from './school-paths.mjs';
import {validateMarkEntry,markEntryId} from './marks-service.mjs';
// Transactionally create a raw mark; never overwrite an existing record.
export async function createSchoolMarkOnly({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);
 const isAdmin=actor?.active===true&&actor.role==='school_admin'&&actor.schoolId===schoolId;
 const isTeacher=actor?.active===true&&actor.role==='teacher'&&actor.schoolId===schoolId&&typeof actor.uid==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid);
 if(!isAdmin&&!isTeacher)throw new Error('School Admin or assigned Teacher permission required');
 const originalIdentity={role:actor.role,active:actor.active,schoolId:actor.schoolId,uid:actor.uid};
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
  if(!student.exists()||student.data().schoolId!==schoolId||student.data().class!==entry.class)throw new Error('Student missing or in another class');
  if(!subject.exists()||subject.data().schoolId!==schoolId||subject.data().active!==true||subject.data().class!==entry.class)throw new Error('Subject missing, inactive or in another class');
  if(Array.isArray(subject.data().components)&&subject.data().components.length)throw new Error('Configured subject requires Assessment Settings component marks; raw marks cannot be saved');
 if(!assignment.exists()||assignment.data().schoolId!==schoolId||assignment.data().active===false||assignment.data().studentId!==entry.studentId||assignment.data().subjectId!==entry.subjectId||assignment.data().class!==entry.class)throw new Error('Student subject assignment required');
  if(isTeacher&&(!teacherAssignment?.exists()||teacherAssignment.data().active!==true||teacherAssignment.data().schoolId!==schoolId||teacherAssignment.data().uid!==actor.uid||teacherAssignment.data().classId!==entry.class||teacherAssignment.data().subjectId!==entry.subjectId))throw new Error('Active teacher class/subject assignment required');
  if(actor.role!==originalIdentity.role||actor.active!==originalIdentity.active||actor.schoolId!==originalIdentity.schoolId||actor.uid!==originalIdentity.uid)throw new Error('School identity changed during mark transaction');
  if(existing.exists()||component.exists())throw new Error('Mark already exists; overwrite blocked');
  tx.set(markRef,{...entry,schoolId});
 });
 return {id,...entry};
}
