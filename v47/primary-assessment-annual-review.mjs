// CDC 2083 Annex 4 (PDF p.149), seven subject rows and weekly periods.
// Saved private drafts only; never combine ambiguous teacher assignments.
import {primarySubjectKey,loadAdminAssessmentWorksheet} from './primary-assessment-teacher-worksheet.mjs';
import {readSchoolSubjectCatalog} from './subject-catalog-view.mjs';
import {readAssessmentDraftProgress} from './primary-assessment-draft-progress.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {assessmentPrintWordBlob} from './primary-assessment-portfolio.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
import {readLocalAssessmentSource} from './primary-assessment-local-source.mjs';
import {validateAttendance} from './attendance-service.mjs';
import {nepalGregorianDate} from './nepal-date.mjs';
import {prepareLegacyAttendance} from './legacy-attendance-history.mjs';
import {lowerAssessmentGrade,upperAssessmentGrade} from './primary-assessment-percentage.mjs';
// School-supplied local curriculum, single saved stage. This is a review under
// the class-level CDC scale, not approval of the school's local rubric or publication.
export function reviewLocalAnnualGrade({grade,expected,rows}){
 if(!['1','2','3','4','5'].includes(grade)||!Number.isInteger(expected)||expected<1||expected>500||!Array.isArray(rows)||!rows.length)throw Error('Invalid local annual review');
 let sum=0,count=0,total=0,available=true;
 for(const r of rows){
  if(r.stage!=='assessment'||!Number.isInteger(r.total)||r.total<1||!Number.isInteger(r.entered)||r.entered<0||r.entered>r.total)throw Error('Invalid local assessment coverage');
  total+=r.total;count+=r.entered;
  if(!r.sourceAvailable){available=false;continue}
  if(!Number.isInteger(r.scoreSum)||r.scoreSum<r.entered||r.scoreSum>4*r.entered)throw Error('Invalid local achievement score');
  sum+=r.scoreSum;
 }
 if(total!==expected)throw Error('Local source count mismatch');
 const complete=available&&count===expected,percentage=count&&available?sum/(4*count)*100:null;
 const lower=['1','2','3'].includes(grade),result=complete?(lower?lowerAssessmentGrade(sum,count):upperAssessmentGrade(percentage)):null;
 return Object.freeze({count,expected,percentage,complete,grade:lower?(result??''):(result?result.letter+' ('+(result.point===null?'—':result.point.toFixed(1))+')':'')});
}
// 2083 only; count recorded daily rows, not school operating days.
export function annualLegacyClassNames(grade){
 if(!['1','2','3','4','5'].includes(grade))throw Error('Invalid primary grade');
 const ne='०१२३४५६७८९'[Number(grade)];
 return [grade,ne,'Class '+grade,'class '+grade,'कक्षा '+grade,'कक्षा '+ne];
}
export function summarizeAnnualAttendance({schoolId,grade,studentId,docs,asOf,legacyDocs=[],section=''}){
 if(!Array.isArray(docs)||docs.length>1000||typeof asOf!=='string')throw Error('Attendance review limit or scope invalid');
 const seen=new Set(),dates=new Map();let excluded=0,duplicates=0;
 const within=date=>date>='2026-04-14'&&date<'2027-04-14'&&date<=asOf;
 const add=(date,status)=>{const statuses=dates.get(date)??new Set();if(statuses.has(status))duplicates++;statuses.add(status);dates.set(date,statuses)};
 for(const doc of docs){
  const d=doc.data();
  if(!d||d.schoolId!==schoolId||d.studentId!==studentId||doc.ref?.path!==undefined&&doc.ref.path!=='schools/'+schoolId+'/attendance/'+doc.id||seen.has(doc.id))throw Error('Attendance identity mismatch');
  seen.add(doc.id);
  const entry=validateAttendance(d);
  if(doc.id!==entry.date+'_'+studentId)throw Error('Attendance document identity mismatch');
  if(entry.class!==grade||!within(entry.date)){excluded++;continue}
  add(entry.date,entry.present?'present':'absent');
 }
 if(!Array.isArray(legacyDocs)||legacyDocs.length>2000)throw Error('Legacy attendance review limit exceeded');
 const names=annualLegacyClassNames(grade);
 for(const doc of legacyDocs){
  const d=doc.data();
  if(!d||d.schoolId!==schoolId||doc.ref?.path!==undefined&&doc.ref.path!=='schools/'+schoolId+'/attendance/'+doc.id||seen.has(doc.id))throw Error('Attendance identity mismatch');
  seen.add(doc.id);
  if(d.attendanceType!=='daily'||String(d.academicYear)!=='2083'||!names.includes(d.className)||String(d.section??'')!==String(section))continue;
  const date=d.date;
  if(typeof date!=='string'||!within(date))continue;
  validateAttendance({studentId,class:grade,date,present:true});
  const batch=prepareLegacyAttendance({schoolId,date,docs:[doc]}).batches[0];
  if(!batch)throw Error('Invalid legacy daily attendance');
  const entry=batch.students.find(s=>s.studentId===studentId);
  if(entry)add(date,entry.status);
 }
 let present=0,absent=0,leave=0,conflicts=0;
 for(const statuses of dates.values()){
  if(statuses.size!==1){conflicts++;continue}
  const status=[...statuses][0];
  if(status==='present')present++;else if(status==='absent')absent++;else if(status==='leave')leave++;
 }
 return Object.freeze({present,absent,leave,recorded:present+absent+leave,excluded,duplicates,conflicts});
}
// The count is supplied from the school's attendance register for this review only.
export function reviewOperatingDays(attendance,rawDays,rawSource,asOf){
 const days=String(rawDays??'').trim(),source=String(rawSource??'').trim();
 if(!days&&!source)return null;
 const elapsed=Math.min(365,Math.max(0,Math.floor((Date.parse(asOf+'T00:00:00Z')-Date.UTC(2026,3,14))/86400000)+1));
 if(!Number.isInteger(elapsed)||!/^\d{1,3}$/.test(days)||Number(days)<1||Number(days)>elapsed||!source||source.length>160||/[\u0000-\u001f\u007f]/.test(source))throw Error('Invalid operating-day count or register reference');
 const operatingDays=Number(days);
 const complete=attendance.conflicts===0&&attendance.recorded===operatingDays;
 return Object.freeze({operatingDays,source,complete,percentage:complete?attendance.present/operatingDays*100:null});
}
export function annualOperatingDaysText(a){return a?'School operating days (Admin supplied): '+a.operatingDays+'; Register: '+a.source+'; Attendance percentage (review): '+(a.percentage===null?'Pending — incomplete/conflicting records':a.percentage.toFixed(2)+'%')+'.':'School operating days not supplied.';}
export function annualAttendanceText(a){return 'V46/V47 daily attendance review: '+a.present+' present, '+a.absent+' absent, '+a.leave+' leave, '+a.recorded+' recorded days; '+a.conflicts+' conflicting dates excluded; '+a.duplicates+' duplicate entries ignored. School operating days require separate register verification.';}

export const upperAnnualSubjects=Object.freeze([['nepali','नेपाली',5],['english','English',5],['mathematics','गणित / Mathematics',5],['science','विज्ञान तथा प्रविधि / Science and Technology',5],['socialstudies','सामाजिक अध्ययन तथा मानवमूल्य शिक्षा',5],['healthphysicalcreativeart','स्वास्थ्य, शारीरिक तथा सिर्जनात्मक कला / Health, Physical and Creative Arts',3],['hamrodhunibeshi','मातृभाषा वा स्थानीय विषय वा अन्य',4]].map(Object.freeze));
// CDC 2076 Annex 2, PDF pp.13–14 (applicable 2083); annual curriculum hours, not weekly periods.
export const lowerAnnualSubjects=Object.freeze([['nepali','नेपाली भाषा',160],['mathematics','गणित / Mathematics',128],['english','English',128],['serophero','हाम्रो सेरोफेरो',256],['hamrodhunibeshi','मातृभाषा / स्थानीय विषय',160]].map(Object.freeze));
export function annualReviewHeaders(grade){return Object.freeze(['SN','Subject',['1','2','3'].includes(grade)?'Annual curriculum hours':'Weekly periods',['1','2','3'].includes(grade)?'Assessment units':'Learning achievements','Assessed / Expected','Overall achievement level (review)','Remarks']);}
export async function readUpperAnnualReview(args){if(!['4','5'].includes(args.grade))throw Error('Upper-primary grade required');return readAnnualReview(args);}
export async function readAnnualReview(args){
 const {actor,schoolId,grade,studentId,db,api,assertCurrent}=args,uid=actor?.uid;
 if(actor?.role!=='school_admin'||actor.active!==true||actor.schoolId!==schoolId||!['1','2','3','4','5'].includes(grade)||args.auth?.currentUser?.uid!==uid||!/^[A-Za-z0-9_-]{1,128}$/.test(studentId??''))throw Error('Verified primary School Admin required');
 const check=()=>{assertCurrent();if(actor.uid!==uid||actor.schoolId!==schoolId||actor.role!=='school_admin'||actor.active!==true||args.auth?.currentUser?.uid!==uid)throw Error('Annual review scope changed')};
 const read=async path=>{check();const s=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return s.exists()?s.data():null};
 const verify=async()=>{const member=await verifySchoolSession({schoolId,uid,readDocument:read});check();if(member.role!=='school_admin')throw Error('School Admin required')};
 await verify();const root='schools/'+schoolId;
 const [student,subjects,assignments]=await Promise.all([read(root+'/students/'+studentId),readSchoolSubjectCatalog({db,api,actor,schoolId,schoolClass:grade,assertCurrent:check}),api.getDocsFromServer(api.query(api.collection(db,'schools',schoolId,'teacher_assignments'),api.where('classId','==',grade),api.limit(501)))]);check();
 if(student?.schoolId!==schoolId||student.class!==grade||student.active===false)throw Error('Active student required');
 if(assignments.docs.length>500)throw Error('Assignment review limit exceeded');
 const duties=assignments.docs.map(d=>{const a=d.data();if(a.schoolId!==schoolId||a.classId!==grade||d.id!==[schoolId,a.uid,grade,a.subjectId].join(':'))throw Error('Assignment identity mismatch');return a}).filter(a=>a.active===true);
 const rows=[],lower=['1','2','3'].includes(grade);
 for(const [index,[key,label,hours]] of (lower?lowerAnnualSubjects:upperAnnualSubjects).entries()){
  check();const matches=subjects.filter(s=>s.active===true&&primarySubjectKey(s.name)===key);
  const blank=note=>[index+1,label,hours,'','','',note];
  if(matches.length!==1){rows.push(blank(matches.length?'Ambiguous subject registration':'Subject not registered'));continue}
  const subject=matches[0],assigned=duties.filter(a=>a.subjectId===subject.id);
  if(assigned.length!==1){rows.push(blank(assigned.length?'Multiple assigned teachers — review required':'No assigned teacher'));continue}
  const teacherUid=assigned[0].uid;
  // A missing local source is not an error for the other subjects.
  const local=key==='hamrodhunibeshi';
  if(local&&!(await readLocalAssessmentSource({...args,subjectId:subject.id,assertCurrent:check}))){rows.push(blank('School local curriculum not registered'));continue}
  const model=await loadAdminAssessmentWorksheet({...args,subjectId:subject.id,teacherUid,assertCurrent:check});
  const progress=await readAssessmentDraftProgress({...args,model,reviewTeacherUid:teacherUid,assertCurrent:check});check();
  if(local){
   const expected=model.themes.reduce((n,t)=>n+t.count,0),total=progress.totals[0];
   const review=reviewLocalAnnualGrade({grade,expected,rows:progress.rows});
   rows.push([index+1,label,hours,expected,total.entered+' / '+expected,review.grade,'School local curriculum · '+model.themes.length+' themes · '+(review.percentage===null?'No complete source evidence':review.percentage.toFixed(2)+'% (draft)')+' · '+(!review.complete?'Incomplete assessment':!review.grade?'90% boundary requires confirmation':'Grade review only; local rubric approval pending')]);
   continue;
  }
  if(lower){
   // Keep stages distinct. A partially checked four-indicator block is not an assessed outcome.
   const binary=key==='serophero',expected=model.themes.reduce((n,t)=>n+(binary?t.scoreBlocks:t.count),0);
   const coverage=progress.totals.map(t=>(t.stage==='regular'?'Regular':t.stage==='support'?'Support':'Assessment')+': '+(binary?t.complete:t.entered)+' / '+expected).join(' | ');
   const unavailable=progress.totals[0].unavailableThemes;
   const review=progress.lowerAnnual;
   const detail=[binary?'Four-indicator score blocks':'Learning achievement rows',unavailable?unavailable+' source themes unavailable':'',review.partial?review.partial+' partial blocks':'',review.conflicts?review.conflicts+' same-date conflicts':'',review.different?review.different+' stage/date differences':'',review.percentage===null?'No complete evidence':review.percentage.toFixed(2)+'% (review)',review.complete?(review.grade?'Review only':'90% boundary requires confirmation'):'Final level pending review'].filter(Boolean).join('; ');
   rows.push([index+1,label,hours,expected,coverage,review.grade??'',detail]);
   continue;
  }
  const a=progress.annual,c=progress.combined,expected=progress.themeReviews.reduce((n,t)=>n+t.expected,0);
  const consistent=a.complete&&c.complete&&!a.conflicts&&!a.different;
  rows.push([index+1,label,hours,expected,a.count+' / '+expected,consistent?a.grade.letter+' ('+(a.grade.point===null?'—':a.grade.point.toFixed(1))+')':'',a.conflicts?'Unresolved date conflicts: '+a.conflicts:a.different?'Stage/date review differs: '+a.different:!a.complete?'Incomplete assessment':consistent?'Review only · '+a.percentage.toFixed(2)+'%':'Review pending']);
 }
 const attendanceSnap=await api.getDocsFromServer(api.query(api.collection(db,'schools',schoolId,'attendance'),api.where('studentId','==',studentId),api.limit(1001)));check();
 const legacySnap=await api.getDocsFromServer(api.query(api.collection(db,'schools',schoolId,'attendance'),api.where('className','in',annualLegacyClassNames(grade)),api.limit(2001)));check();
 const asOf=nepalGregorianDate();
 const attendance=summarizeAnnualAttendance({schoolId,grade,studentId,docs:attendanceSnap.docs,legacyDocs:legacySnap.docs,section:String(student.section??''),asOf});
 const operating=reviewOperatingDays(attendance,args.operatingDays,args.registerSource,asOf);
 await verify();check();
 return Object.freeze({attendance,operating,title:lower?'Annual Student Progress — Annex 2 Review':'Annual Student Progress — Annex 4 Review',schoolId,studentId,studentName:String(student.nameEnglish??student.name??studentId),grade,section:String(student.section??''),year:'2083',historical:0,headers:annualReviewHeaders(grade),rows:Object.freeze(rows.map(Object.freeze)),notice:'Saved teacher drafts only — NOT official annual report. Migrated assessment observations are not included. Daily attendance is a review, not verified school operating days.',stageSummary:(lower?'CDC 2076 A*–E scale; draft levels only. ':'') +annualAttendanceText(attendance)+' '+annualOperatingDaysText(operating)+' Signatures pending official verification. Class teacher __________ · Headteacher __________ · Date __________',officialAssessmentApproved:false});
}
export function exportUpperAnnualReview(report,kind){
 if(!['word','excel'].includes(kind))throw Error('Invalid annual export');
 const blob=kind==='word'?assessmentPrintWordBlob(report):excelWorkbook(['Status','School ID','Student ID','Student','Class','Year','Attendance summary','Operating days review',...report.headers],report.rows.map(row=>[report.notice,report.schoolId,report.studentId,report.studentName,report.grade,report.year,annualAttendanceText(report.attendance),annualOperatingDaysText(report.operating),...row]),{sheetName:'Annual review'});
 return {blob,filename:'V47-ANNUAL-REVIEW-'+report.schoolId+'-'+report.studentId+'-2083.'+(kind==='word'?'docx':'xlsx')};
}
