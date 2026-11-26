// Offline, unapproved grade-sheet HTML print preview. Never fetches or writes school data.
import {createIemisGradeSheetPreview,previewIemisGradeSheet} from './iemis-grade-sheet-preview.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function renderIemisGradeSheetPrint({school,...args}){
 if(!school||typeof school.nameEnglish!=='string'||!school.nameEnglish.trim()||school.nameEnglish.length>160)throw Error('Valid school name required');
 return renderResolvedGradeSheet(school,args,previewIemisGradeSheet(args));
}
// Lazily validate the complete snapshot once, then render each requested student.
export function createIemisGradeSheetPrinter({school,...args}){
 const snapshot=structuredClone({school,...args});
 let preview;
 return studentId=>{
  if(!preview)preview=createIemisGradeSheetPreview(snapshot);
  return renderResolvedGradeSheet(snapshot.school,{...snapshot,studentId},preview(studentId));
 };
}
function renderResolvedGradeSheet(school,args,result){
 if(!school||typeof school.nameEnglish!=='string'||!school.nameEnglish.trim()||school.nameEnglish.length>160)throw Error('Valid school name required');
 if(!result.ready)return {ready:false,reason:result.reason,html:null};
 const student=result.student;
 const identity=args.students.find(s=>s.id===student.studentId);
 const reg=identity?.studentIemisNo||identity?.iemisStudentNo||identity?.registrationNo||identity?.iemisNumber||identity?.iemisNo||'';
 const symbol=identity?.symbolNo||identity?.symbolNumber||identity?.examSymbolNo||'';
 const dob=identity?.dob||identity?.dateOfBirth||'';
 const detail=[['Registration No.',reg],['Symbol No.',symbol],['Date of Birth',dob]].filter(([,value])=>value!==''&&value!=null).map(([label,value])=>esc(label)+': '+esc(value)).join(' | ');
 if(school.addressEnglish!==undefined&&(typeof school.addressEnglish!=='string'||school.addressEnglish.length>250))throw Error('Invalid school address');
 const subjects=student.subjects.map((item,index)=>{
  const summary=item.summary??{};
  return '<tr><td>'+String(index+1)+'</td><td>'+esc(args.subjects.find(s=>s.id===item.subjectId)?.name??item.subjectId)+'</td><td>'+esc(item.creditHour)+'</td><td>'+esc(summary.obtained??'—')+' / '+esc(summary.full??'—')+'</td><td>'+esc(summary.inGrade?.grade??'—')+'</td><td>'+esc(summary.theoryGrade?.grade??'—')+'</td><td>'+esc(summary.totalGrade?.grade??'—')+'</td><td>'+esc(summary.totalGrade?.point??'—')+'</td></tr>';
 }).join('');
 if(school.nameNepali!==undefined&&(typeof school.nameNepali!=='string'||school.nameNepali.length>160))throw Error('Invalid Nepali school name');
 if(school.addressNepali!==undefined&&(typeof school.addressNepali!=='string'||school.addressNepali.length>250))throw Error('Invalid Nepali school address');
 const name=esc(school.nameEnglish),address=esc(school.addressEnglish??'');
 const nepaliName=school.nameNepali?.trim()?'<p lang="ne">'+esc(school.nameNepali)+'</p>':'';
 const nepaliAddress=school.addressNepali?.trim()?'<p lang="ne">'+esc(school.addressNepali)+'</p>':'';
 // Presentation only: use the same physical frame thickness at both sizes.
 // Final is a full A4 portrait sheet; each terminal print is one A5 portrait card.
 const finalDesign=student.term==='final';
 const pageStyle=finalDesign
  ?'@page{size:A4 portrait;margin:10mm}.sheet{width:190mm;min-height:276mm;padding:11mm}.sheet h1{font-size:19pt}.sheet h2{font-size:17pt}.sheet td,.sheet th{padding:2mm;font-size:10pt}'
  :'@page{size:A5 portrait;margin:6mm}.sheet{width:136mm;min-height:197mm;padding:6mm}.sheet h1{font-size:13pt}.sheet h2{font-size:12pt}.sheet p,.sheet footer{font-size:8pt;margin:3px}.sheet table{margin-top:10px}.sheet td,.sheet th{padding:1mm;font-size:8pt}.sheet .notice{padding:3px}';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grade Sheet Preview</title><meta name="robots" content="noindex,nofollow"><style>body{font-family:Arial,sans-serif;color:#111;margin:0}.sheet{position:relative;isolation:isolate;box-sizing:border-box;border:1.4mm solid #1000cc;margin:0 auto;overflow-wrap:anywhere}.sheet:after{content:"";position:absolute;inset:1.2mm;border:.55mm solid #1000cc;pointer-events:none;z-index:1}.sheet h1,.sheet th{color:#102b65}.sheet h2{color:#c40000}.sheet table{table-layout:fixed}.sheet td,.sheet th{border-color:#1000cc}.sheet td:nth-child(2),.sheet th:nth-child(2){width:26%}.sheet td:first-child,.sheet th:first-child{width:5%} .sheet:before{-webkit-print-color-adjust:exact;print-color-adjust:exact;content:"";position:absolute;inset:0;z-index:-1;opacity:.16;background-repeat:repeat;background-size:240px 160px;background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27240%27 height=%27160%27%3E%3Ctext x=%2720%27 y=%2780%27 transform=%27rotate(-25 120 80)%27 fill=%27%23555%27 font-size=%2724%27 font-family=%27Arial%27 font-weight=%27bold%27%3EPREVIEW ONLY%3C/text%3E%3C/svg%3E")}h1,h2,p{text-align:center;margin:7px}h1{font-size:20px}h2{font-size:16px}.notice{border:2px solid #555;padding:7px;font-weight:bold}table{border-collapse:collapse;width:100%;margin-top:20px}td,th{border:1px solid #555;padding:8px;text-align:left}footer{margin-top:22px;font-size:12px}'+pageStyle+'@media screen{.sheet{max-width:100%}}@media print{.sheet{break-inside:avoid}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><main class="sheet"><h1>'+name+'</h1>'+nepaliName+'<p>'+address+'</p>'+nepaliAddress+'<h2>GRADE SHEET — UNAPPROVED PREVIEW</h2><p class="notice">NOT VALID FOR OFFICIAL USE</p><p>Student: '+esc(student.studentName)+' | Class: '+esc(student.classNo)+' | Term: '+esc(student.term)+'</p>'+(detail?'<p>'+detail+'</p>':'')+'<table><thead><tr><th>No.</th><th>Subject</th><th>Credit Hour</th><th>Obtained / Full</th><th>Internal Grade</th><th>Theory Grade</th><th>Total Grade</th><th>Grade Point</th></tr></thead><tbody>'+subjects+'</tbody></table><p>GPA: '+esc(student.gpa.toFixed(2))+'</p><footer>Read-only development preview. Verify against official IEMIS before issuing certificates.</footer></main></body></html>';
 return {ready:true,reason:null,html};
}
