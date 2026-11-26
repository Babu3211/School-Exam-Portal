// Original migrated subject records: teacher assignment and fresh server reads.
// No fallback to another term, no grade calculation, no write or draft replacement.
import {verifySchoolSession} from './verified-school-session.mjs';
import {verifyTeacherSubjectAssignment} from './verified-teacher-subject-assignment.mjs';
import {resolveScopedReportExam} from './scoped-legacy-report-exam.mjs';
import {iemisSubjectKey} from './iemis-ledger.js';
export async function loadAssignedLegacyMarks({db,api,actor,schoolId,classId,subjectId,term,assertCurrent}){
 if(!['1st','2nd','3rd','final'].includes(term)||!/^(?:[1-9]|10)$/.test(classId)||typeof assertCurrent!=='function')throw Error('Verified class and term required');
 const uid=actor?.uid;
 const check=()=>{assertCurrent();if(actor?.uid!==uid||actor?.role!=='teacher'||actor?.schoolId!==schoolId||actor?.active!==true)throw Error('Teacher session changed')};
 const readDocument=async path=>{check();const s=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return s.exists()?s.data():null};
 const verify=async()=>{check();const member=await verifySchoolSession({schoolId,uid,readDocument});check();if(member.role!=='teacher')throw Error('Teacher role changed')};
 const assignment=()=>verifyTeacherSubjectAssignment({db,api:{...api,getDoc:api.getDocFromServer},actor,schoolId,classId,subjectId,revalidate:verify});
 const assigned=await assignment();check();
 const query=api.query(api.collection(db,'schools',schoolId,'marks'),api.where('class','==',classId),api.where('term','==',term),api.where('subjectId','==',subjectId),api.limit(3001));
 const snap=await api.getDocsFromServer(query);check();
 if(!Array.isArray(snap?.docs)||snap.docs.length>3000)throw Error('Marks history limit exceeded');
 const records=[],seen=new Set();
 for(const d of snap.docs){
  if(!/^[A-Za-z0-9_:-]{1,256}$/.test(d.id)||seen.has(d.id)||d.ref?.path!==undefined&&d.ref.path!=='schools/'+schoolId+'/marks/'+d.id)throw Error('Invalid original mark identity');
  seen.add(d.id);const r=d.data();
  if(!r||r.schoolId!==schoolId||r.class!==classId||r.term!==term||r.subjectId!==subjectId||iemisSubjectKey(r.subject)!==iemisSubjectKey(assigned.subjectName)||!/^[A-Za-z0-9_-]{1,128}$/.test(r.studentId)||!Array.isArray(r.scores)||!r.scores.length||r.scores.length>30)throw Error('Foreign or invalid original marks');
  records.push({...r,id:d.id});
 }
 const groups=new Map();
 for(const r of records){const list=groups.get(r.examId)??[];list.push(r);groups.set(r.examId,list)}
 const rows=[];
 for(const [examId,list] of groups){
  await resolveScopedReportExam({schoolId,classNo:classId,term,records:list,readDocument,assertCurrent:check});
  const ids=new Set();
  for(const r of list){
   if(ids.has(r.studentId))throw Error('Duplicate original student marks in one exam');
   ids.add(r.studentId);
   const scores=r.scores.map(s=>{
    if(typeof s?.name!=='string'||!s.name.trim()||typeof s.fullMarks!=='number'||!Number.isFinite(s.fullMarks)||s.fullMarks<0||s.obtained!==null&&(typeof s.obtained!=='number'||!Number.isFinite(s.obtained)||s.obtained<0||s.obtained>s.fullMarks))throw Error('Invalid original score component');
    return Object.freeze({name:s.name,fullMarks:s.fullMarks,obtained:s.obtained});
   });
   const student=await readDocument('schools/'+schoolId+'/students/'+r.studentId);
   if(!student||student.schoolId!==schoolId)throw Error('Original student identity unavailable');
   rows.push(Object.freeze({id:r.id,examId,academicYear:r.academicYear??null,studentId:r.studentId,studentName:String(student.nameEnglish??student.name??r.studentId),isAbsent:r.isAbsent===true,scores:Object.freeze(scores),totalObtained:r.totalObtained??null,totalFullMarks:r.totalFullMarks??null}));
  }
 }
 await assignment();check();
 return Object.freeze({schoolId,classId,subjectId,term,rows:Object.freeze(rows),readOnly:true,publicationAllowed:false});
}
