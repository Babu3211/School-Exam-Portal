// Read only: V46 attendance batches stored intact in the V47 tenant collection.
// Never collapse leave into absence or combine daily and subject attendance.
import {validateSchoolId} from './school-paths.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const idPattern=/^[A-Za-z0-9_-]{1,128}$/;
const statuses=new Set(['present','absent','leave']);
export function prepareLegacyAttendance({schoolId,date,docs}){
 validateSchoolId(schoolId);
 if(!datePattern.test(date)||!Array.isArray(docs)||docs.length>2000)throw Error('Invalid attendance history scope');
 const batches=[],seen=new Set();
 for(const doc of docs){
  if(!idPattern.test(doc.id||'')||seen.has(doc.id)||doc.ref?.path!==undefined&&doc.ref.path!=='schools/'+schoolId+'/attendance/'+doc.id)throw Error('Invalid attendance history document');
  seen.add(doc.id);const d=doc.data();
  if(!d||d.schoolId!==schoolId||d.date!==date)throw Error('Foreign attendance history record');
  // New V47 single-student attendance is a different schema.
  if(!Object.hasOwn(d,'students')&&!Object.hasOwn(d,'className')&&!Object.hasOwn(d,'attendanceType'))continue;
  if(typeof d.className!=='string'||!d.className.trim()||!['daily','subject'].includes(d.attendanceType)||d.attendanceType==='subject'&&(typeof d.subject!=='string'||!d.subject.trim())||!Array.isArray(d.students)||!d.students.length||d.students.length>1500)throw Error('Invalid V46 attendance batch');
  const ids=new Set(),totals={present:0,absent:0,leave:0},rows=[];
  for(const s of d.students){
   if(!s||typeof s.studentId!=='string'||!s.studentId||ids.has(s.studentId)||typeof s.studentName!=='string'||!s.studentName||!statuses.has(s.status)||typeof s.remark!=='string')throw Error('Invalid V46 attendance student');
   ids.add(s.studentId);totals[s.status]++;
   rows.push(Object.freeze({studentId:s.studentId,studentName:s.studentName,status:s.status,remark:s.remark,rollNo:s.rollNo??''}));
  }
  if(d.totalStudents!==rows.length||d.presentCount!==totals.present||d.absentCount!==totals.absent||d.leaveCount!==totals.leave)throw Error('V46 attendance totals mismatch');
  batches.push(Object.freeze({id:doc.id,date:d.date,className:d.className,section:String(d.section??''),attendanceType:d.attendanceType,subject:String(d.subject??''),academicYear:String(d.academicYear??''),totalStudents:d.totalStudents,presentCount:d.presentCount,absentCount:d.absentCount,leaveCount:d.leaveCount,students:Object.freeze(rows)}));
 }
 return Object.freeze({schoolId,date,batches:Object.freeze(batches),readOnly:true});
}
export async function readLegacyAttendance({db,api,actor,schoolId,date,assertCurrent}){
 validateSchoolId(schoolId);
 if(!datePattern.test(date)||actor?.schoolId!==schoolId||actor.active!==true||!['school_admin','viewer'].includes(actor.role)||!idPattern.test(actor.uid||'')||typeof assertCurrent!=='function')throw Error('Verified Admin or Viewer required');
 const {uid,role}=actor;
 const check=()=>{assertCurrent();if(actor.uid!==uid||actor.role!==role||actor.schoolId!==schoolId||actor.active!==true)throw Error('Attendance session changed')};
 const verify=async()=>{check();const member=await verifySchoolSession({schoolId,uid,readDocument:async path=>{const s=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return s.exists()?s.data():null}});check();if(member.role!==role)throw Error('Attendance role changed')};
 await verify();
 const query=api.query(api.collection(db,'schools',schoolId,'attendance'),api.where('date','==',date),api.limit(2001));
 const snapshot=await api.getDocsFromServer(query);check();
 const result=prepareLegacyAttendance({schoolId,date,docs:snapshot.docs});
 await verify();check();return result;
}
export async function exportLegacyAttendance(args){
 const data=await readLegacyAttendance(args);args.assertCurrent();
 if(!data.batches.length)throw Error('No saved V46 attendance');
 const headers=['School ID','Original Batch ID','Date (AD)','Academic Year','Class','Section','Attendance Type','Subject','Student ID','Student Name','Roll No','Status','Remark','Batch Total','Batch Present','Batch Absent','Batch Leave'];
 const rows=data.batches.flatMap(b=>b.students.map(s=>[data.schoolId,b.id,b.date,b.academicYear,b.className,b.section,b.attendanceType,b.subject,s.studentId,s.studentName,s.rollNo,s.status,s.remark,b.totalStudents,b.presentCount,b.absentCount,b.leaveCount]));
 const blob=excelWorkbook(headers,rows,{sheetName:'V46 attendance'});
 args.assertCurrent();return Object.freeze({blob,filename:'V46-attendance-'+data.schoolId+'-'+data.date+'.xlsx',count:rows.length});
}
