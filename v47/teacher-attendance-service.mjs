import {validateSchoolId} from './school-paths.mjs';
import {validateAttendance} from './attendance-service.mjs';

const UID=/^[A-Za-z0-9_-]{1,128}$/;
export function teacherAttendanceAssignmentId({schoolId,uid,classId}){
 validateSchoolId(schoolId);
 if(typeof uid!=='string'||!UID.test(uid))throw new Error('Invalid teacher UID');
 const sample=validateAttendance({studentId:'sample',class:classId,date:'2026-01-01',present:true});
 return schoolId+':'+uid+':'+sample.class+':attendance';
}
export async function saveAssignedTeacherAttendance({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);
 if(actor?.role!=='teacher'||actor.active!==true||actor.schoolId!==schoolId||typeof actor.uid!=='string'||!UID.test(actor.uid))throw new Error('Active assigned teacher required');
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
 const entry=validateAttendance(input);
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firestore transaction methods');
 const doc=(collection,id)=>api.doc(db,'schools',schoolId,collection,id);
 const assignmentRef=doc('teacher_assignments',teacherAttendanceAssignmentId({schoolId,uid:actor.uid,classId:entry.class}));
 const studentRef=doc('students',entry.studentId);
 const attendanceRef=doc('attendance',entry.date+'_'+entry.studentId);
 await api.runTransaction(db,async tx=>{
  const [assignment,student,previous]=await Promise.all([tx.get(assignmentRef),tx.get(studentRef),tx.get(attendanceRef)]);
  if(!assignment.exists()||assignment.data().schoolId!==schoolId||assignment.data().uid!==actor.uid||assignment.data().classId!==entry.class||assignment.data().subjectId!=='attendance'||assignment.data().active!==true)throw new Error('Active teacher attendance assignment required');
  if(!student.exists()||student.data().schoolId!==schoolId||student.data().class!==entry.class)throw new Error('Student missing or belongs to another school/class');
  if(previous.exists())throw new Error('Existing attendance cannot be overwritten by teacher');
  if(actor.uid!==identity.uid||actor.role!==identity.role||actor.active!==identity.active||actor.schoolId!==identity.schoolId)
   throw new Error('Teacher identity changed during attendance transaction');
  tx.set(attendanceRef,{...entry,schoolId});
 });
 return {id:entry.date+'_'+entry.studentId,...entry,schoolId};
}
