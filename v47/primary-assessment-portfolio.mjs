// V46 ordinary CDC observations only. Keep raw observation identity, stage and
// 1–4 ratings separate from IEMIS marks. No writes or inferred grades.
import {excelWorkbook} from './excel-workbook.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
const idPattern=/^[A-Za-z0-9_-]{1,128}$/;
const gradeOf=v=>String(v??'').trim().replace(/[०-९]/g,d=>String('०१२३४५६७८९'.indexOf(d))).match(/^(?:(?:class|कक्षा)\s*)?([1-5])$/i)?.[1];
export function prepareObservationPortfolio({schoolId,grade,student,year='2083',docs}){
 validateSchoolId(schoolId);
 if(!['1','2','3','4','5'].includes(grade)||year!=='2083'||student?.schoolId!==schoolId||student.class!==grade||student.active===false||!idPattern.test(student.id||'')||!Array.isArray(docs)||docs.length>2000)throw Error('Invalid portfolio scope');
 const seen=new Set(),rows=[];
 let historical=0;
 for(const doc of docs){
  const d=doc.data(),id=doc.id;
  if(typeof id!=='string'||!id||id.includes('/')||seen.has(id)||doc.ref?.path!==undefined&&doc.ref.path!=='schools/'+schoolId+'/cdc_observations/'+id||!d||d.schoolId!==schoolId||d.studentId!==student.id||d.academicYear!==year)throw Error('Foreign or duplicate CDC observation');
  seen.add(id);
  if(gradeOf(d.className)!==grade||String(d.section??'')!==String(student.section??'')){historical++;continue}
  if(!Number.isInteger(d.level)||d.level<1||d.level>4||typeof d.subject!=='string'||!d.subject.trim()||typeof d.unit!=='string'||!d.unit.trim()||typeof d.topic!=='string'||!d.topic.trim()||typeof d.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||d.stage!==undefined&&!['regular','support',''].includes(d.stage))throw Error('Invalid saved CDC observation');
  rows.push(Object.freeze({id,subject:d.subject,unit:d.unit,unitEn:String(d.unitEn??''),topic:d.topic,topicAlt:String(d.topicAlt??''),stage:d.stage||'',date:d.date,level:d.level,method:String(d.method??''),evidence:String(d.evidence??''),feedback:String(d.feedback??'')}));
 }
 rows.sort((a,b)=>b.date.localeCompare(a.date)||a.subject.localeCompare(b.subject)||a.id.localeCompare(b.id));
 return Object.freeze({schoolId,grade,studentId:student.id,year,rows:Object.freeze(rows),historical,readOnly:true,officialAssessmentApproved:false,indicatorBlocksIncluded:false});
}
export async function readObservationPortfolio({db,api,actor,schoolId,grade,studentId,assertCurrent}){
 validateSchoolId(schoolId);
 if(actor?.schoolId!==schoolId||actor.active!==true||!['school_admin','viewer'].includes(actor.role)||!idPattern.test(actor.uid||'')||!idPattern.test(studentId||'')||!['1','2','3','4','5'].includes(grade)||typeof assertCurrent!=='function')throw Error('Verified Admin or Viewer portfolio required');
 const {uid,role}=actor;
 const check=()=>{assertCurrent();if(actor.uid!==uid||actor.schoolId!==schoolId||actor.role!==role||actor.active!==true)throw Error('Portfolio session changed')};
 const read=async path=>{check();const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return snap.exists()?snap.data():null};
 const verify=async()=>{const member=await verifySchoolSession({schoolId,uid,readDocument:read});check();if(member.role!==role)throw Error('Portfolio role changed')};
 await verify();
 const student=await read('schools/'+schoolId+'/students/'+studentId);
 if(!student||student.schoolId!==schoolId||student.class!==grade||student.active===false)throw Error('Student outside portfolio scope');
 const query=api.query(api.collection(db,'schools',schoolId,'cdc_observations'),api.where('studentId','==',studentId),api.where('academicYear','==','2083'),api.limit(2001));
 const snapshot=await api.getDocsFromServer(query);check();
 const result=prepareObservationPortfolio({schoolId,grade,student:{...student,id:studentId},docs:snapshot.docs});
 await verify();check();return result;
}

 // Only the existing school-scoped, Admin/Viewer ordinary observation reader
 // may feed this non-official export. No CDC indicator blocks or grades inferred.
export async function exportObservationPortfolio(args){
 const result=await readObservationPortfolio(args);
 args.assertCurrent();
 if(!result.rows.length)throw Error('No saved observations to export');
 const headers=['Export status','School ID','Academic Year','Class','Student ID','Observation ID','Subject','Theme','Theme (English)','Learning Achievement','Alternate Achievement','Stage','Date (BS)','Rating','Tools','Evidence','Remarks','Excluded historical count'];
 const rows=result.rows.map(r=>['Ordinary observations only - NOT official assessment; indicator blocks excluded',result.schoolId,result.year,result.grade,result.studentId,r.id,r.subject,r.unit,r.unitEn,r.topic,r.topicAlt,r.stage,r.date,r.level,r.method,r.evidence,r.feedback,result.historical]);
 const blob=excelWorkbook(headers,rows,{sheetName:'Observations only'});
 args.assertCurrent();
 return Object.freeze({blob,filename:'V47-observations-'+result.schoolId+'-'+result.studentId+'-2083.xlsx',count:rows.length});
}
