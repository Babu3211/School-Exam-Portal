import {validateSchoolId} from './school-paths.mjs';
import {validateAttendance} from './attendance-service.mjs';
import {teacherAttendanceAssignmentId} from './teacher-attendance-service.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {PartialAttendanceSaveError} from './attendance-class-save.mjs';
export async function saveTeacherClassAttendance({db,api,actor,schoolId,entries,assertSession,onProgress=()=>{}}){
 validateSchoolId(schoolId);
 if(actor?.role!=='teacher'||actor.active!==true||actor.schoolId!==schoolId||!actor.uid||typeof assertSession!=='function')
  throw Error('Verified assigned Teacher required');
 if(!Array.isArray(entries)||entries.length<1||entries.length>1500)throw Error('Select 1–1500 students');
 const rows=entries.map(validateAttendance),{class:classId,date}=rows[0],ids=new Set();
 for(const e of rows){if(e.class!==classId||e.date!==date||ids.has(e.studentId))throw Error('Mixed class/date or duplicate student');ids.add(e.studentId)}
 const uid=actor.uid,check=()=>{assertSession();if(actor.uid!==uid||actor.schoolId!==schoolId||actor.role!=='teacher'||actor.active!==true)throw Error('Teacher session changed')};
 const doc=(c,id)=>api.doc(db,'schools',schoolId,c,id);
 const assignment=doc('teacher_assignments',teacherAttendanceAssignmentId({schoolId,uid,classId}));
 check();
 let saved=0,changed=0;
 // Keep a small rule-access budget. No whole-class atomicity claim.
 for(let start=0;start<rows.length;start+=5){
  const chunk=rows.slice(start,start+5);
  try{
   check();
   changed+=await api.runTransaction(db,async tx=>{
    const duty=await tx.get(assignment);
    const d=duty.exists()?duty.data():null;
    if(d?.schoolId!==schoolId||d.uid!==uid||d.classId!==classId||d.subjectId!=='attendance'||d.active!==true)throw Error('Active teacher attendance assignment required');
    const refs=chunk.map(e=>doc('attendance',date+'_'+e.studentId));
    const students=await Promise.all(chunk.map(e=>tx.get(doc('students',e.studentId))));
    const prior=await Promise.all(refs.map(r=>tx.get(r)));
    check();
    const writes=[];
    for(let i=0;i<chunk.length;i++){
     const e=chunk[i],student=students[i].exists()?students[i].data():null;
     if(student?.schoolId!==schoolId||student.class!==classId||!isActiveEnrolledStudent(student))throw Error('Student roster changed or school mismatch');
     if(prior[i].exists()){
      const r=prior[i].data();
      if(!r||Object.keys(r).sort().join(',')!=='class,date,present,schoolId,studentId'||
       r.schoolId!==schoolId||r.class!==classId||r.date!==date||r.studentId!==e.studentId||typeof r.present!=='boolean')
       throw Error('Existing attendance identity or format mismatch');
      if(r.present!==e.present)writes.push(()=>tx.update(refs[i],{present:e.present}));
     }else writes.push(()=>tx.set(refs[i],{...e,schoolId}));
    }
    check();for(const write of writes)write();return writes.length;
   });
  }catch(cause){throw new PartialAttendanceSaveError(saved,rows.length,cause,rows.slice(start).map(e=>e.studentId))}
  saved+=chunk.length;
  try{onProgress({saved,total:rows.length,savedIds:chunk.map(e=>e.studentId)})}catch{}
 }
 return {saved,total:rows.length,changed,unchanged:saved-changed};
}
