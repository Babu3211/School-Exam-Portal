import {assertGrade9CurriculumPractice} from './grade9-curriculum-practice.mjs';
import {assertComputerPracticeGrid} from './computer-grid-practice.mjs';
// V47 isolated, read-only CDC source and SMSS practice-paper preview.
// V46 source metadata / original practice questions reused; no Firebase writes,
// blueprint completeness assertion, IEMIS result, or generated official exam.
import {validateSchoolId} from './school-paths.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const officialUrl=url=>typeof url==='string'&&/^https:\/\/(?:(?:www|lib)\.)?moecdc\.gov\.np\//i.test(url);
export const PRACTICE_GRADES=Object.freeze([8,10]);
const TYPES=new Set(['mcq','short','long']);
const status=Object.freeze({
 approved:false,official:false,teacherReviewRequired:true,writeAuthorized:false,
 notice:'UNREVIEWED ORIGINAL PRACTICE — NOT AN OFFICIAL CDC QUESTION PAPER'
});
export function prepareCdcSourceCatalog(register,{grade}={}){
 if(!register||register.schemaVersion!==1||!Array.isArray(register.sources)||register.sources.length<1)
  throw Error('V46 CDC source register required');
 if(grade!==undefined&&(!Number.isSafeInteger(Number(grade))||Number(grade)<1||Number(grade)>12))
  throw Error('Invalid grade');
 const sources=register.sources.map((item,index)=>{
  if(!item||!Array.isArray(item.grades)||!item.grades.length||
   item.grades.some(g=>!Number.isInteger(g)||g<1||g>12)||
   typeof item.subject!=='string'||!item.subject.trim()||item.subject.length>220||
   typeof item.version!=='string'||item.version.length>100||
   typeof item.status!=='string'||item.status.length>75||!officialUrl(item.url))
   throw Error('Invalid or non-CDC source #'+(index+1));
  return Object.freeze({subject:item.subject,grades:Object.freeze([...item.grades]),version:item.version,
   kind:String(item.kind??''),status:item.status,url:item.url});
 });
 const matching=grade===undefined?sources:sources.filter(s=>s.grades.includes(Number(grade)));
 return Object.freeze({
  checkedOn:register.checkedOn??null,grade:grade===undefined?null:Number(grade),
  sources:Object.freeze(matching),completeOfficialBlueprint:false,
  metadataOnly:true,writeAuthorized:false,
  note:'CDC source references from V46. Links alone do not prove topic lists, blueprint or answer-key completeness.'
 });
}
function validatePack(pack){
 if(!pack||pack.schemaVersion!==1||!PRACTICE_GRADES.includes(pack.gradeNumber)||
    !Array.isArray(pack.units)||!pack.units.length||!Array.isArray(pack.questions)||
    !pack.questions.length||pack.questions.length>200||
    typeof pack.status!=='string'||!pack.status.includes('teacher_review_required')||
    typeof pack.sourceTitle!=='string'||!officialUrl(pack.sourceUrl))
  throw Error('Only preserved V46 teacher-review-required practice packs may be previewed');
 const units=new Map();
 for(const unit of pack.units){
  if(!unit||typeof unit.unitCode!=='string'||!unit.unitCode||units.has(unit.unitCode)||
     typeof unit.unitTitle!=='string'||!unit.unitTitle.trim()||!Array.isArray(unit.topics))
   throw Error('Malformed or duplicate curriculum unit');
  units.set(unit.unitCode,new Set(unit.topics.map(t=>String(t).trim().toLocaleLowerCase())));
 }
 const seen=new Set();
 for(const q of pack.questions){
  if(!q||!TYPES.has(q.questionType)||typeof q.questionText!=='string'||!q.questionText.trim()||
     q.questionText.length>6000||!Number.isFinite(q.marks)||q.marks<=0||q.marks>100||
     !units.has(String(q.unitCode))||
     !units.get(String(q.unitCode)).has(String(q.topicName??'').trim().toLocaleLowerCase())||
     typeof q.answer!=='string'||!q.answer.trim()||q.answer.length>12000||
     (q.questionType==='mcq'&&(!Array.isArray(q.options)||q.options.length!==4||
       q.options.some(s=>typeof s!=='string'||!s.trim())||!['A','B','C','D'].includes(q.correctOption))))
   throw Error('Invalid or unreviewed practice question data');
  const signature=q.questionText.trim().toLocaleLowerCase();
  if(seen.has(signature))throw Error('Repeated practice question');
  seen.add(signature);
 }
 return pack;
}
export function prepareReadOnlyPracticePaper({schoolId,schoolName,pack,questionIndices}){
 validateSchoolId(schoolId);
 if(typeof schoolName!=='string'||!schoolName.trim()||schoolName.length>160)
  throw Error('Verified school name required');
 validatePack(pack);
 if(!Array.isArray(questionIndices)||!questionIndices.length||questionIndices.length>40||
    questionIndices.some(i=>!Number.isSafeInteger(i)||i<0||i>=pack.questions.length)||
    new Set(questionIndices).size!==questionIndices.length)
  throw Error('Unique practice question indices required (maximum 40)');
 const questions=questionIndices.map(i=>Object.freeze({...pack.questions[i],options:pack.questions[i].options===undefined?[]:Object.freeze([...pack.questions[i].options])}));
 const marks=questions.reduce((sum,q)=>sum+q.marks,0);
 if(!Number.isFinite(marks)||marks>250)throw Error('Practice sample total marks exceeds 250');
 return Object.freeze({
  ...status,schoolId,schoolName,grade:pack.gradeNumber,
  subject:pack.canonicalSubject,sourceTitle:pack.sourceTitle,sourceUrl:pack.sourceUrl,
  questions:Object.freeze(questions),totalMarks:marks,questionCount:questions.length,
  sourceStatus:pack.status
 });
}
export function recommendedPracticeIndices(pack){
 validatePack(pack);
 const targets=[['mcq',5],['short',4],['long',2]],indices=[];
 for(const [type,max] of targets){
  for(let i=0,count=0;i<pack.questions.length&&count<max;i++)
   if(pack.questions[i].questionType===type){indices.push(i);count++}
 }
 if(!indices.length)throw Error('No practice questions found');
 return Object.freeze(indices.sort((a,b)=>a-b));
}
export function printReadOnlyPracticePaper({paper,showAnswers=false}){
 if(!paper||paper.approved!==false||paper.official!==false||
    paper.teacherReviewRequired!==true||paper.writeAuthorized!==false||
    !Array.isArray(paper.questions)||!paper.questions.length||
    !(PRACTICE_GRADES.includes(paper.grade)&&officialUrl(paper.sourceUrl)||paper.grade===9&&(paper.questionFormat==='grade9_curriculum_practice'?assertGrade9CurriculumPractice(paper):assertComputerPracticeGrid(paper)))||
    typeof showAnswers!=='boolean')
  throw Error('Verified read-only practice paper required');
 let marks=0;
 const questions=paper.questions.map((q,index)=>{
  marks+=q.marks;
  const options=q.questionType==='mcq'?'<ol type="A">'+q.options.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>':'';
  return '<li><div>'+esc(q.questionText)+' <em>('+esc(q.marks)+' marks)</em></div>'+options+
    (showAnswers?'<p class="answer">Teacher-review answer: '+(q.questionType==='mcq'&&q.correctOption?esc(q.correctOption)+' — ':'')+esc(q.answer)+'</p>':'')+'</li>';
 }).join('');
 if(marks!==paper.totalMarks)throw Error('Practice marks changed after preview');
 const watermark='data:image/svg+xml,'+encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="390" height="225" viewBox="0 0 390 225">'+
  '<g transform="rotate(-23 195 112)"><text x="25" y="120" font-family="Arial,sans-serif"'+
  ' font-size="27" font-weight="bold" fill="#b91c1c" opacity=".13">UNREVIEWED PRACTICE</text></g></svg>'
 );
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">'+
 '<title>UNREVIEWED SMSS Practice Paper</title>'+
 '<style>@page{size:A4'+(paper.grade===9?' landscape':'')+';margin:14mm}html,body{margin:0}body{font:14px system-ui,sans-serif;color:#172238;background-image:url("'+watermark+'");background-repeat:repeat;background-size:390px 225px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{position:relative;min-height:255mm}.warning{border:2px solid #b81c1c;padding:10px;text-align:center;background:#fff}h1,h2,p{text-align:center}ol{padding-left:25px}ol>li{margin:13px 0;break-inside:avoid;page-break-inside:avoid}li>div,.answer{white-space:pre-line}.answer{background:#f0f2f7;text-align:left;padding:5px}@media print{.sheet{break-inside:auto;page-break-inside:auto}}</style></head><body><main class="sheet">'+
 '<h1>'+esc(paper.schoolName)+'</h1><h2>Class '+esc(paper.grade)+' · '+esc(paper.subject)+'</h2>'+
 '<p class="warning">UNREVIEWED ORIGINAL PRACTICE — NOT AN OFFICIAL CDC QUESTION PAPER</p>'+
 '<p>Questions: '+esc(paper.questionCount)+' | Total marks: '+esc(paper.totalMarks)+
 ' | '+(showAnswers?'UNAPPROVED TEACHER REVIEW ANSWERS':'PRACTICE QUESTIONS')+'</p>'+
 '<ol'+(paper.grade===9?' style="columns:2;column-gap:12mm"':'')+'>'+questions+'</ol><footer>V46-sourced SMSS practice pack. Teacher must verify against current CDC specification grid before any real exam. No data saved.</footer></main></body></html>';
}
