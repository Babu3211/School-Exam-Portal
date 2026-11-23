import {validateSchoolId} from './school-paths.mjs';
import {validateAttendance} from './attendance-service.mjs';

const UID=/^[A-Za-z0-9_-]{1,128}$/;
export function teacherAttendanceAssignmentId({schoolId,uid,classId}){
 validateSchoolId(schoolId);
 if(typeof uid!=='string'||!UID.test(uid))throw new Error('Invalid teacher UID');
 const sample=validateAttendance({studentId:'sample',class:classId,date:'2026-01-01',present:true});
 return schoolId+':'+uid+':'+sample.class+':attendance';
}
export async function saveAssignedTeacherAttendance({db,api,actor,schoolId,input,assertSession=()=>{}}){
 validateSchoolId(schoolId);
 if(actor?.role!=='teacher'||actor.active!==true||actor.schoolId!==schoolId||typeof actor.uid!=='string'||!UID.test(actor.uid))throw new Error('Active assigned teacher required');
 if(typeof assertSession!=='function')throw new TypeError('Live teacher session verifier required');
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
 const check=()=>{
  assertSession();
  if(actor.uid!==identity.uid||actor.role!==identity.role||actor.active!==identity.active||actor.schoolId!==identity.schoolId)
   throw new Error('Teacher identity changed during attendance transaction');
 };
 check();
 const entry=validateAttendance(input);
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firestore transaction methods');
 const doc=(collection,id)=>api.doc(db,'schools',schoolId,collection,id);
 const assignmentRef=doc('teacher_assignments',teacherAttendanceAssignmentId({schoolId,uid:actor.uid,classId:entry.class}));
 const studentRef=doc('students',entry.studentId);
 const attendanceRef=doc('attendance',entry.date+'_'+entry.studentId);
 const corrected=await api.runTransaction(db,async tx=>{
  const [assignment,student,previous]=await Promise.all([tx.get(assignmentRef),tx.get(studentRef),tx.get(attendanceRef)]);
  check();
  if(!assignment.exists()||assignment.data().schoolId!==schoolId||assignment.data().uid!==actor.uid||assignment.data().classId!==entry.class||assignment.data().subjectId!=='attendance'||assignment.data().active!==true)throw new Error('Active teacher attendance assignment required');
  if(!student.exists()||student.data().schoolId!==schoolId||student.data().class!==entry.class)throw new Error('Student missing or belongs to another school/class');
  check();
  let corrected=false;
  if(previous.exists()){
   const data=previous.data();
   if(!data||typeof data!=='object'||Array.isArray(data)||
      Object.keys(data).sort().join(',')!==['schoolId','studentId','class','date','present'].sort().join(',')||
      data.schoolId!==schoolId||data.studentId!==entry.studentId||
      data.class!==entry.class||data.date!==entry.date||typeof data.present!=='boolean')
    throw new Error('Existing attendance identity or format mismatch; cannot correct');
   if(typeof tx.update!=='function')throw new TypeError('Firestore update transaction required for corrections');
   check();
   tx.update(attendanceRef,{present:entry.present});
   corrected=true;
  }else{
   check();
   tx.set(attendanceRef,{...entry,schoolId});
  }
  return corrected;
 });
 // Do not turn a committed transaction into an apparent failure if auth changes after commit.
 return {id:entry.date+'_'+entry.studentId,...entry,schoolId,corrected};
}
