// CDC 2083 Annex 4 (PDF p.149), seven subject rows and weekly periods.
// Saved private drafts only; never combine ambiguous teacher assignments.
import {primarySubjectKey,loadAdminAssessmentWorksheet} from './primary-assessment-teacher-worksheet.mjs';
import {readSchoolSubjectCatalog} from './subject-catalog-view.mjs';
import {readAssessmentDraftProgress} from './primary-assessment-draft-progress.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {assessmentPrintWordBlob} from './primary-assessment-portfolio.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
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
  // Local curriculum has no certified national grade rule. Do not fabricate it.
  if(key==='hamrodhunibeshi'){rows.push(blank('School local curriculum — annual grade rule pending'));continue}
  const model=await loadAdminAssessmentWorksheet({...args,subjectId:subject.id,teacherUid,assertCurrent:check});
  const progress=await readAssessmentDraftProgress({...args,model,reviewTeacherUid:teacherUid,assertCurrent:check});check();
  if(lower){
   // Keep stages distinct. A partially checked four-indicator block is not an assessed outcome.
   const binary=key==='serophero',expected=model.themes.reduce((n,t)=>n+(binary?t.scoreBlocks:t.count),0);
   const coverage=progress.totals.map(t=>(t.stage==='regular'?'Regular':t.stage==='support'?'Support':'Assessment')+': '+(binary?t.complete:t.entered)+' / '+expected).join(' | ');
   const unavailable=progress.totals[0].unavailableThemes;
   rows.push([index+1,label,hours,expected,coverage,'',(binary?'Four-indicator score blocks; ':'Learning achievement rows; ')+(unavailable?unavailable+' source themes unavailable; ':'')+'Final level pending review']);
   continue;
  }
  const a=progress.annual,c=progress.combined,expected=progress.themeReviews.reduce((n,t)=>n+t.expected,0);
  const consistent=a.complete&&c.complete&&!a.conflicts&&!a.different;
  rows.push([index+1,label,hours,expected,a.count+' / '+expected,consistent?a.grade.letter+' ('+(a.grade.point===null?'—':a.grade.point.toFixed(1))+')':'',a.conflicts?'Unresolved date conflicts: '+a.conflicts:a.different?'Stage/date review differs: '+a.different:!a.complete?'Incomplete assessment':consistent?'Review only · '+a.percentage.toFixed(2)+'%':'Review pending']);
 }
 await verify();check();
 return Object.freeze({title:lower?'Annual Student Progress — Annex 2 Review':'Annual Student Progress — Annex 4 Review',schoolId,studentId,studentName:String(student.nameEnglish??student.name??studentId),grade,section:String(student.section??''),year:'2083',historical:0,headers:annualReviewHeaders(grade),rows:Object.freeze(rows.map(Object.freeze)),notice:'Saved teacher drafts only — NOT official annual report. Migrated observations and school operating-day attendance are not included.',stageSummary:(lower?'CDC 2076 A*–E scale; final levels pending. ':'')+'Attendance and signatures pending official verification. Class teacher __________ · Headteacher __________ · Date __________',officialAssessmentApproved:false});
}
export function exportUpperAnnualReview(report,kind){
 if(!['word','excel'].includes(kind))throw Error('Invalid annual export');
 const blob=kind==='word'?assessmentPrintWordBlob(report):excelWorkbook(['Status','School ID','Student ID','Student','Class','Year',...report.headers],report.rows.map(row=>[report.notice,report.schoolId,report.studentId,report.studentName,report.grade,report.year,...row]),{sheetName:'Annual review'});
 return {blob,filename:'V47-ANNUAL-REVIEW-'+report.schoolId+'-'+report.studentId+'-2083.'+(kind==='word'?'docx':'xlsx')};
}
