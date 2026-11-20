// Offline, unapproved grade-sheet HTML print preview. Never fetches or writes school data.
import {previewIemisGradeSheet} from './iemis-grade-sheet-preview.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function renderIemisGradeSheetPrint({school,...args}){
 if(!school||typeof school.nameEnglish!=='string'||!school.nameEnglish.trim()||school.nameEnglish.length>160)throw Error('Valid school name required');
 const result=previewIemisGradeSheet(args);
 if(!result.ready)return {ready:false,reason:result.reason,html:null};
 const student=result.student;
 const subjects=student.subjects.map((item,index)=>{
  const summary=item.summary??{};
  return '<tr><td>'+String(index+1)+'</td><td>'+esc(args.subjects.find(s=>s.id===item.subjectId)?.name??item.subjectId)+'</td><td>'+esc(item.creditHour)+'</td><td>'+esc(summary.obtained??'—')+' / '+esc(summary.full??'—')+'</td><td>'+esc(summary.inGrade?.grade??'—')+'</td><td>'+esc(summary.theoryGrade?.grade??'—')+'</td><td>'+esc(summary.totalGrade?.grade??'—')+'</td><td>'+esc(summary.totalGrade?.point??'—')+'</td></tr>';
 }).join('');
 if(school.addressEnglish!==undefined&&(typeof school.addressEnglish!=='string'||school.addressEnglish.length>250))throw Error('Invalid school address');
 const name=esc(school.nameEnglish),address=esc(school.addressEnglish??'');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grade Sheet Preview</title><meta name="robots" content="noindex,nofollow"><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#111;margin:0}.sheet{position:relative;isolation:isolate;min-height:260mm;padding:12mm;box-sizing:border-box}.sheet:before{content:"";position:absolute;inset:0;z-index:-1;opacity:.16;background-repeat:repeat;background-size:240px 160px;background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27240%27 height=%27160%27%3E%3Ctext x=%2720%27 y=%2780%27 transform=%27rotate(-25 120 80)%27 fill=%27%23555%27 font-size=%2724%27 font-family=%27Arial%27 font-weight=%27bold%27%3EPREVIEW ONLY%3C/text%3E%3C/svg%3E")}h1,h2,p{text-align:center;margin:7px}h1{font-size:20px}h2{font-size:16px}.notice{border:2px solid #555;padding:7px;font-weight:bold}table{border-collapse:collapse;width:100%;margin-top:20px}td,th{border:1px solid #555;padding:8px;text-align:left}footer{margin-top:22px;font-size:12px}@media print{.sheet{break-inside:avoid}}</style></head><body><main class="sheet"><h1>'+name+'</h1><p>'+address+'</p><h2>GRADE SHEET — UNAPPROVED PREVIEW</h2><p class="notice">NOT VALID FOR OFFICIAL USE</p><p>Student: '+esc(student.studentName)+' | Class: '+esc(student.classNo)+' | Term: '+esc(student.term)+'</p><table><thead><tr><th>No.</th><th>Subject</th><th>Credit Hour</th><th>Obtained / Full</th><th>Internal Grade</th><th>Theory Grade</th><th>Total Grade</th><th>Grade Point</th></tr></thead><tbody>'+subjects+'</tbody></table><p>GPA: '+esc(student.gpa)+'</p><footer>Read-only development preview. Verify against official IEMIS before issuing certificates.</footer></main></body></html>';
 return {ready:true,reason:null,html};
}
