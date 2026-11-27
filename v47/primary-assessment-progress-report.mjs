// Saved-only subject progress report, for one verified Admin review selection.
import {readAssessmentDraftProgress} from './primary-assessment-draft-progress.mjs';
import {assessmentPrintWordBlob} from './primary-assessment-portfolio.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
import {formatCombinedAchievement,formatAnnualAchievement} from './primary-assessment-percentage.mjs';
export function buildSubjectProgressReport(args,progress){
 const {model,studentId,reviewTeacherUid}=args,student=model.students.find(s=>s.id===studentId);
 if(!student||!reviewTeacherUid||progress.officialAssessmentApproved!==false)throw Error('Verified saved subject progress required');
 const headers=['Theme','Review / Stage','Assessed / Expected','Completed / Expected','Obtained','Maximum','Percentage','Status / Review grade'];
 const pct=v=>v===null?'':v.toFixed(2)+'%';
 const rows=progress.rows.map(r=>[r.theme,r.stage==='regular'?'Regular':r.stage==='support'?'Remedial':'Assessment',r.sourceAvailable?r.entered+' / '+r.total:'',r.sourceAvailable?r.complete+' / '+r.totalGroups:'',r.scoreSum===null||!r.entered?'':r.scoreSum,r.scoreSum===null||!r.entered?'':r.entered*4,pct(r.percentage),r.sourceAvailable?r.revision===null?'Not saved':'Saved · R'+r.revision:'Source unavailable']);
 function addReview(theme,label,r,expected){
  rows.push([theme,label,r?r.count+' / '+expected:'',r?r.count+' / '+expected:'',r?.complete?r.sum:'',expected*4,r?.complete?pct(r.percentage):'',r?r.grade?.letter??(r.conflicts?'Unresolved same-date conflicts: '+r.conflicts:'Incomplete'):'Source unavailable']);
 }
 for(const t of progress.themeReviews){addReview(t.theme,'Combined review',t.combined,t.expected);addReview(t.theme,'Annual date-order review',t.annual,t.expected)}
 if(progress.combined){const expected=progress.themeReviews.reduce((n,t)=>n+t.expected,0);addReview('Total','Combined review',progress.combined,expected);addReview('Total','Annual date-order review',progress.annual,expected)}
 const stageSummary=[progress.combined?formatCombinedAchievement(progress.combined):'',progress.annual?formatAnnualAchievement(progress.annual):''].filter(Boolean).join(' | ');
 return Object.freeze({title:'Subject Assessment Progress — '+model.subjectName,schoolId:model.schoolId,studentId,studentName:student.name,grade:model.grade,section:student.section,year:'2083',historical:0,stageSummary,headers:Object.freeze(headers),rows:Object.freeze(rows.map(Object.freeze)),notice:'Saved teacher drafts only · Teacher: '+reviewTeacherUid+' · NOT official assessment or grade. Migrated historical records are not included.',officialAssessmentApproved:false});
}
export async function readSubjectProgressReport(args){const progress=await readAssessmentDraftProgress(args);args.assertCurrent();return buildSubjectProgressReport(args,progress)}
export function exportSubjectProgressReport(report,kind){
 if(!['word','excel'].includes(kind))throw Error('Invalid progress export');
 const blob=kind==='word'?assessmentPrintWordBlob(report):excelWorkbook(['Status','School ID','Student ID','Student','Class','Year','Subject summary',...report.headers],report.rows.map(row=>[report.notice,report.schoolId,report.studentId,report.studentName,report.grade,report.year,report.title,...row]),{sheetName:'Subject progress'});
 return {blob,filename:'V47-SUBJECT-PROGRESS-'+report.schoolId+'-'+report.studentId+'-2083.'+(kind==='word'?'docx':'xlsx')};
}
