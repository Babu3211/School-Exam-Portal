// Trusted Admin SDK only. All class attendance writes use one transaction,
// preserving the existing attendance collection and its individual correction API.
// For larger classes refuse rather than claim that multiple commits are atomic.
import {createHash} from 'node:crypto';
import {validateSchoolId} from './school-paths.mjs';
import {validateAttendance} from './attendance-service.mjs';
import {validateCompleteClassAttendance} from './class-attendance-completeness.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {teacherAttendanceAssignmentId} from './teacher-attendance-service.mjs';
export const ATOMIC_ATTENDANCE_LIMIT=500;
const segment=/^[A-Za-z0-9_-]{1,128}$/;
const fields='class,date,present,schoolId,studentId';
const exists=s=>typeof s?.exists==='function'?s.exists():s?.exists===true;
const value=s=>exists(s)?s.data():null;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export async function reviewOrSaveAtomicClassAttendance({firestore,schoolId,classId,date,actorUid,entries,reviewDigest=null}){
 validateSchoolId(schoolId);
 validateAttendance({studentId:'probe',class:classId,date,present:true});
 if(typeof actorUid!=='string'||!segment.test(actorUid))throw Error('Verified actor required');
 if(reviewDigest!==null&&(typeof reviewDigest!=='string'||!/^[a-f0-9]{64}$/.test(reviewDigest)))throw Error('Invalid review digest');
 if(!Array.isArray(entries)||entries.length<1||entries.length>ATOMIC_ATTENDANCE_LIMIT)throw RangeError('Atomic class attendance supports 1–500 students');
 if(entries.some(e=>!e||Object.keys(e).sort().join(',')!=='class,date,present,studentId'))throw Error('Unexpected attendance entry fields');
 if(typeof firestore?.doc!=='function'||typeof firestore?.collection!=='function'||typeof firestore?.runTransaction!=='function')throw TypeError('Trusted Firestore required');
 const ref=(...p)=>firestore.doc(['schools',schoolId,...p].join('/'));
 return firestore.runTransaction(async tx=>{
  const school=value(await tx.get(ref())),member=value(await tx.get(ref('members',actorUid)));
  if(school?.id!==schoolId||school.active!==true||member?.schoolId!==schoolId||member.uid!==actorUid||member.active!==true||!['school_admin','teacher'].includes(member.role))
   throw Error('Active School Admin or assigned Teacher required');
  if(member.role==='teacher'){
   const id=teacherAttendanceAssignmentId({schoolId,uid:actorUid,classId});
   const a=value(await tx.get(ref('teacher_assignments',id)));
   if(a?.active!==true||a.schoolId!==schoolId||a.uid!==actorUid||a.classId!==classId||a.subjectId!=='attendance')
    throw Error('Active class attendance assignment required');
  }
  const query=firestore.collection(['schools',schoolId,'students'].join('/')).where('class','==',classId).orderBy('__name__').limit(1501);
  const roster=await tx.get(query);
  if(!Array.isArray(roster?.docs)||!roster.docs.length||roster.docs.length>1500)throw Error('Complete authoritative roster unavailable');
  const ids=[],seen=new Set();
  for(const doc of roster.docs){
   const st=doc.data();
   if(typeof doc.id!=='string'||!segment.test(doc.id)||seen.has(doc.id)||doc.ref?.path!==ref('students',doc.id).path||
      st?.schoolId!==schoolId||st.class!==classId)throw Error('Foreign or duplicate roster student');
   seen.add(doc.id);
   if(isActiveEnrolledStudent(st))ids.push(doc.id);
  }
  if(ids.length>ATOMIC_ATTENDANCE_LIMIT)throw RangeError('Class exceeds 500-student atomic write limit; no changes made');
  const checked=validateCompleteClassAttendance({schoolId,classId,date,expectedStudentIds:ids,entries});
  const desired=checked.entries.sort((a,b)=>a.studentId<b.studentId?-1:a.studentId>b.studentId?1:0);
  const refs=desired.map(e=>ref('attendance',date+'_'+e.studentId));
  const before=typeof tx.getAll==='function'?await tx.getAll(...refs):await Promise.all(refs.map(r=>tx.get(r)));
  if(!Array.isArray(before)||before.length!==refs.length)throw Error('Complete existing attendance unavailable');
  const previous=before.map((s,i)=>{
   if(s?.ref?.path!==undefined&&s.ref.path!==refs[i].path)throw Error('Attendance response identity mismatch');
   const record=value(s),e=desired[i];
   if(record===null)return null;
   if(Object.keys(record).sort().join(',')!==fields||record.schoolId!==schoolId||record.class!==classId||
      record.date!==date||record.studentId!==e.studentId||typeof record.present!=='boolean')
    throw Error('Existing attendance identity or format mismatch');
   return record.present;
  });
  const digest=hash({schoolId,classId,date,actorUid,role:member.role,rows:desired.map((e,i)=>[e.studentId,previous[i],e.present])});
  const changed=desired.reduce((n,e,i)=>n+Number(previous[i]!==e.present),0);
  if(reviewDigest===null)return {atomic:true,committed:false,schoolId,classId,date,count:desired.length,changed,reviewDigest:digest};
  if(reviewDigest!==digest)throw Error('Attendance changed after review; reload and review again');
  // All reads above occur before ANY writes. Transaction retries recompute the
  // digest and refuse concurrent corrections rather than overwrite them.
  for(let i=0;i<desired.length;i++)if(previous[i]!==desired[i].present)tx.set(refs[i],{...desired[i],schoolId});
  return {atomic:true,committed:true,schoolId,classId,date,count:desired.length,changed};
 });
}
