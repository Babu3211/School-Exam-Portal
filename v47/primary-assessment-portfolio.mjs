// V46 ordinary CDC observations only. Keep raw observation identity, stage and
// 1–4 ratings separate from IEMIS marks. No writes or inferred grades.
import {excelWorkbook,officeZip} from './excel-workbook.mjs';
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
 return Object.freeze({schoolId,grade,studentId:student.id,studentName:String(student.nameEnglish??student.name??''),section:String(student.section??''),year,rows:Object.freeze(rows),historical,readOnly:true,officialAssessmentApproved:false,indicatorBlocksIncluded:false});
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

 // Separate read-only V46 four-indicator evidence. Never convert it to a
 // regular 1–4 observation or an official subject grade.
export function prepareIndicatorPortfolio({schoolId,grade,student,docs}){
 validateSchoolId(schoolId);
 if(!['1','2','3'].includes(grade)||student?.schoolId!==schoolId||student.class!==grade||student.active===false||!idPattern.test(student.id||'')||!Array.isArray(docs)||docs.length>2000)throw Error('Invalid indicator portfolio scope');
 const seen=new Set(),keys=new Set(),rows=[];let historical=0;
 for(const doc of docs){
  const d=doc.data(),id=doc.id;
  if(typeof id!=='string'||!id||id.includes('/')||seen.has(id)||doc.ref?.path!==undefined&&doc.ref.path!=='schools/'+schoolId+'/cdc_serofero_indicators/'+id||!d||d.schoolId!==schoolId||d.studentId!==student.id||d.academicYear!=='2083')throw Error('Foreign or duplicate indicator record');
  seen.add(id);
  if(gradeOf(d.className)!==grade||String(d.section??'')!==String(student.section??'')){historical++;continue}
  if(typeof d.subject!=='string'||!d.subject.trim()||typeof d.unit!=='string'||!d.unit.trim()||!new RegExp('^cdc2076-g'+grade+'-[1-9][0-9]*$').test(d.outcomeId)||!['regular','support'].includes(d.stage)||typeof d.date!=='string'||!/^2083-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[0-2])$/.test(d.date)||!Array.isArray(d.indicators)||d.indicators.length!==4||d.indicators.some(v=>typeof v!=='boolean')||d.usedTools!==undefined&&(!Array.isArray(d.usedTools)||d.usedTools.length!==4||d.usedTools.some(v=>typeof v!=='string')))throw Error('Invalid saved indicator block');
  const key=JSON.stringify([d.subject,d.unit,d.outcomeId,d.stage]);if(keys.has(key))throw Error('Duplicate indicator block stage');keys.add(key);
  rows.push(Object.freeze({id,subject:d.subject,unit:d.unit,outcomeId:d.outcomeId,stage:d.stage,date:d.date,indicators:Object.freeze([...d.indicators]),score:d.indicators.filter(Boolean).length,usedTools:Object.freeze([...(d.usedTools??['','','',''])])}));
 }
 rows.sort((a,b)=>a.unit.localeCompare(b.unit)||a.outcomeId.localeCompare(b.outcomeId,undefined,{numeric:true})||a.stage.localeCompare(b.stage));
 return Object.freeze({schoolId,grade,studentId:student.id,studentName:String(student.nameEnglish??student.name??''),section:String(student.section??''),year:'2083',rows:Object.freeze(rows),historical,readOnly:true,officialAssessmentApproved:false});
}
export async function readIndicatorPortfolio({db,api,actor,schoolId,grade,studentId,assertCurrent}){
 validateSchoolId(schoolId);
 if(actor?.schoolId!==schoolId||actor.active!==true||!['school_admin','viewer'].includes(actor.role)||!idPattern.test(actor.uid||'')||!idPattern.test(studentId||'')||!['1','2','3'].includes(grade)||typeof assertCurrent!=='function')throw Error('Verified Admin or Viewer indicator portfolio required');
 const {uid,role}=actor;
 const check=()=>{assertCurrent();if(actor.uid!==uid||actor.schoolId!==schoolId||actor.role!==role||actor.active!==true)throw Error('Portfolio session changed')};
 const read=async path=>{check();const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return snap.exists()?snap.data():null};
 const verify=async()=>{const member=await verifySchoolSession({schoolId,uid,readDocument:read});check();if(member.role!==role)throw Error('Portfolio role changed')};
 await verify();
 const student=await read('schools/'+schoolId+'/students/'+studentId);
 if(!student||student.schoolId!==schoolId||student.class!==grade||student.active===false)throw Error('Student outside portfolio scope');
 const query=api.query(api.collection(db,'schools',schoolId,'cdc_serofero_indicators'),api.where('schoolId','==',schoolId),api.where('studentId','==',studentId),api.where('academicYear','==','2083'),api.limit(2001));
 const snapshot=await api.getDocsFromServer(query);check();
 const result=prepareIndicatorPortfolio({schoolId,grade,student:{...student,id:studentId},docs:snapshot.docs});
 await verify();check();return result;
}

// Four-indicator records export separately; zero scores remain numeric zero.
export async function exportIndicatorPortfolio(args){
 const result=await readIndicatorPortfolio(args);
 args.assertCurrent();
 if(!result.rows.length)throw Error('No saved indicator blocks to export');
 const headers=['Export status','School ID','Academic Year','Class','Student ID','Record ID','Subject','Theme','Block ID','Stage','Date (BS)','Indicator 1','Indicator 2','Indicator 3','Indicator 4','Block Score / 4','Tool 1','Tool 2','Tool 3','Tool 4','Excluded historical count'];
 const rows=result.rows.map(r=>['Saved indicator blocks only - NOT official assessment',result.schoolId,result.year,result.grade,result.studentId,r.id,r.subject,r.unit,r.outcomeId,r.stage,r.date,...r.indicators.map(v=>v?1:0),r.score,...r.usedTools,result.historical]);
 const blob=excelWorkbook(headers,rows,{sheetName:'Indicator blocks'});
 args.assertCurrent();
 return Object.freeze({blob,filename:'V47-indicators-'+result.schoolId+'-'+result.studentId+'-2083.xlsx',count:rows.length});
}

// A fresh, verified saved-record print model, not a CDC official form.
export async function readPortfolioPrintModel(args,kind){
 if(!['observations','indicators'].includes(kind))throw Error('Invalid print type');
 const result=await (kind==='observations'?readObservationPortfolio(args):readIndicatorPortfolio(args));
 args.assertCurrent();
 if(!result.rows.length)throw Error('No saved records to print');
 const stage=s=>s==='regular'?'Regular':s==='support'?'Additional Support':'—';
 const join=(a,b)=>[a,b].filter(Boolean).join(' / ');
 const headers=kind==='observations'?['Subject','Theme','Learning Achievement','Stage','Date (BS)','Rating / 4','Tools','Evidence','Remarks']:['Subject','Theme','Block ID','Stage','Date (BS)','1','2','3','4','Score / 4','Tools'];
 const rows=result.rows.map(r=>Object.freeze(kind==='observations'?[r.subject,join(r.unit,r.unitEn),join(r.topic,r.topicAlt),stage(r.stage),r.date,r.level,r.method,r.evidence,r.feedback]:[r.subject,r.unit,r.outcomeId,stage(r.stage),r.date,...r.indicators.map(v=>v?1:0),r.score,r.usedTools.join(' / ')]));
 return Object.freeze({kind,title:kind==='observations'?'Saved Assessment Observations':'Saved Four-Indicator Blocks',schoolId:result.schoolId,studentId:result.studentId,studentName:result.studentName,grade:result.grade,section:result.section,year:result.year,historical:result.historical,headers:Object.freeze(headers),rows:Object.freeze(rows),notice:'Read-only record copy — NOT official assessment or grade sheet',officialAssessmentApproved:false});
}


// Word is a faithful copy of the same fresh read-only print model, never a grade.
export async function exportPortfolioWord(args,kind){
 const model=await readPortfolioPrintModel(args,kind);
 args.assertCurrent();
 return Object.freeze({blob:assessmentPrintWordBlob(model),filename:'V47-'+kind+'-'+model.schoolId+'-'+model.studentId+'-2083.docx',count:model.rows.length});
}
// Shared, pure document renderer for already verified saved-record models.
export function assessmentPrintWordBlob(model){
 const xml=s=>String(s??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const p=(s,bold=false,size=18)=>'<w:p><w:r><w:rPr>'+(bold?'<w:b/>':'')+'<w:sz w:val="'+size+'"/><w:szCs w:val="'+size+'"/></w:rPr><w:t xml:space="preserve">'+xml(s)+'</w:t></w:r></w:p>';
 const width=Math.floor(15100/model.headers.length);
 const cell=(v,head)=>'<w:tc><w:tcPr><w:tcW w:w="'+width+'" w:type="dxa"/>'+(head?'<w:shd w:fill="E6EDF5"/>':'')+'</w:tcPr>'+p(v,head)+'</w:tc>';
 const tr=(values,head=false)=>'<w:tr><w:trPr><w:cantSplit/>'+(head?'<w:tblHeader/>':'')+'</w:trPr>'+values.map(v=>cell(v,head)).join('')+'</w:tr>';
 const borders=['top','left','bottom','right','insideH','insideV'].map(k=>'<w:'+k+' w:val="single" w:sz="4" w:color="808080"/>').join('');
 const table='<w:tbl><w:tblPr><w:tblW w:w="15100" w:type="dxa"/><w:tblBorders>'+borders+'</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>'+model.headers.map(()=>'<w:gridCol w:w="'+width+'"/>').join('')+'</w:tblGrid>'+tr(model.headers,true)+model.rows.map(r=>tr(r)).join('')+'</w:tbl>';
 const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+p(model.title,true,30)+p('SMSS Exam Portal V47 · School ID: '+model.schoolId+' · Academic Year: '+model.year)+p('Student: '+(model.studentName||model.studentId)+' · Student ID: '+model.studentId+' · Class: '+model.grade+' · Section: '+model.section)+p(model.notice,true)+p('Records: '+model.rows.length+' · Excluded historical records: '+model.historical)+table+'<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="680" w:right="680" w:bottom="680" w:left="680" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:body></w:document>';
 const blob=officeZip([
 ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
 ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
 ['word/document.xml',doc]
 ],'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 return blob;
}
