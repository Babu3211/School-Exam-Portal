/** Alternative-source Grade 9 model references checked on 2026-11-24.
 * Reference arithmetic and actual question-bank shortages, never official
 * current-grid approval. No external question text is copied.
 */
import {cdcSubjectKey} from './cdc-grid-source-index.mjs';
import {auditGrade9ScienceArchive} from './cdc-grade9-science-archive-audit.mjs';
import {auditEnglishChart} from './cdc-grade9-english-practice.mjs';
import {auditCompulsoryMathArchive} from './cdc-grade9-compulsory-math-practice.mjs';
const refs={
 nepali:{url:'https://science-playground.com/learn/grade-9-nepali/papers?from=explained',sourceType:'third-party model summary',year:'2080 grid claimed by publisher',areas:[['Vocabulary',6],['Spelling',3],['Language structure',15],['Reading comprehension',8],['Guided writing',4],['Functional writing',4],['Note taking',2],['Summary',3],['Text comprehension',12],['Interpretation',4],['Critical response',7],['Essay',7]],modelCount:24,minutes:180,limitations:['Original CDC grid not inspected','Seen textbook passages, grouped tasks and alternatives still needed']},
 social:{url:'https://riviera.edu.np/storage/newfiles/sz6EjaHjK75ANpCvsVindqTnqLRlidKFQp81Spva.pdf',officialArchiveUrl:'https://giwmscdnone.gov.np/media/pdf_upload/RS11166_Specification%20Grid%20%28Grade%209%29%20Compulsory%20Social%20Studies%20%281%29_jlqxsmn.pdf',sourceType:'CDC 2078 feedback copy, school mirror page 1 visually inspected',year:'2078',minutes:180,modelCount:24,groups:[['very_short',11,1],['short',9,4],['long',4,7]],limitations:['Feedback copy, not verified current approved grid','Historical unit order differs from new practice outline','Map alternative required','Grid and model unit allocation need reconciliation']},
 optional_environment:{url:'https://anyflip.com/jwxmu/hsyg/basic/101-150',modelUrl:'https://pubhtml5.com/zkqo/xwte/basic/151-179',sourceType:'school syllabus search extract and older school practice model',year:'2083 school syllabus; older model',minutes:135,modelCount:22,groups:[['very_short',11,1],['short',8,5],['long',3,8]],olderModelGroups:[['very_short',11,1],['short',8,5],['long',2,12]],limitations:['School syllabus is not official CDC Grid','Current syllabus page only search extract, open returned 403','Older model differs in long-question count and marks','Ten school syllabus units differ from nine provisional SMSS units']}
};
// Visually checked school mirror p.1; the extracted text misreads row 3
// as 5 marks rather than 8. Do not trust OCR over the actual printed grid.
// Columns: very short, short, long; each has knowledge/bodh, application/
// creative, higher. Printed historic units 7/8 correspond to SMSS 8/7.
const socialRows=[
 [1,1,[1,0,0,0,0,1,0,0,0]],
 [2,2,[0,0,1,1,0,0,0,0,0]],
 [3,3,[0,0,0,0,1,1,0,0,0]],
 [4,4,[1,1,0,0,0,1,0,0,0]],
 [5,5,[0,0,0,1,0,0,0,0,1]],
 [6,6,[0,0,0,1,0,0,0,1,0]],
 [7,8,[1,0,1,0,0,0,1,0,0]],
 [8,7,[1,1,0,0,0,0,0,1,0]],
 [9,9,[1,0,1,0,1,0,0,0,0]],
 [10,10,[0,1,0,1,0,0,0,0,0]]
];
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const groupMarks=groups=>sum(groups.map(([,count,marks])=>count*marks));
const category=l=>l==='knowledge'||l==='understanding'?0:l==='application'?1:l==='higher'?2:-1;
export function auditGrade9ModelReference({grade,subject,questions=[]}={}){
 if(grade!==9)return null;
 const k=cdcSubjectKey(subject);
 let r=refs[k]?structuredClone(refs[k]):null;
 if(k==='science'){
  const s=auditGrade9ScienceArchive({grade,subject});
  if(!s)return null;
  r={url:s.archivedModel.officialArchiveUrl,sourceType:'government 2078 archive, text read; screenshot timed out',year:'2078',minutes:180,modelCount:40,groups:s.archivedModel.groups.map(g=>[g.code,g.count,g.marksEach]),limitations:['Official sample checklist totals 74, not 75','Latest revised grid not confirmed','Old unit titles differ from newer textbook','Cognitive parts can span levels']};
 }
 if(k==='english'){
  const s=auditEnglishChart({grade,subject});if(!s)return null;
  r={url:s.sourceUrl,sourceType:'CDC 9–10 chart, included model grade 10',year:'current grade 9 applicability pending',minutes:180,areas:[['Reading',40],['Writing',24],['Grammar',11]],limitations:['Grade 9 model and complete seen/unseen groups required','Half-mark items need grouped format']};
 }
 if(k==='math'){
  const s=auditCompulsoryMathArchive({grade,subject});if(!s)return null;
  r={url:s.sourceUrl,sourceType:'government historical chart',year:'2078',minutes:180,modelCount:16,itemCount:49,areas:s.areas.map(a=>[a.nameEn,a.marks]),limitations:['Current revision not verified','Grouped question and subquestion structure required']};
 }
 if(!r)return null;
 const total=r.groups?groupMarks(r.groups):sum(r.areas.map(a=>a[1]));
 if(total!==75)throw Error('Reference marks are inconsistent');
 const bank=questions.filter(q=>q.gradeNumber===9&&cdcSubjectKey(q.subject)===k&&q.status!=='archived');
 const groups=r.groups?.map(([type,required,marks])=>{
  const available=bank.filter(q=>q.questionType===type&&Number(q.marks)===marks).length;
  return {type,marks,required,available,missing:Math.max(0,required-available)};
 })||[];
 let slots=[],unitMarks=[],cognitiveMarks=null;
 if(k==='social'){
  const types=['very_short','short','long'],marks=[1,4,7];
  unitMarks=socialRows.map(([historicUnit,currentUnit,row])=>{
   row.forEach((required,i)=>{
    if(!required)return;
    const g=Math.floor(i/3),c=i%3;
    const available=bank.filter(q=>String(q.unitCode)===String(currentUnit)&&q.questionType===types[g]&&Number(q.marks)===marks[g]&&category(q.cognitiveLevel)===c).length;
    slots.push({historicUnit,currentUnit,type:types[g],marks:marks[g],category:c,required,available,missing:Math.max(0,required-available)});
   });
   return sum(row.map((n,i)=>n*marks[Math.floor(i/3)]));
  });
  cognitiveMarks=[0,1,2].map(c=>sum(slots.filter(s=>s.category===c).map(s=>s.required*s.marks)));
  if(sum(unitMarks)!==75||sum(slots.map(s=>s.required))!==24||
    JSON.stringify(cognitiveMarks)!=='[28,25,22]')throw Error('Historic social grid transcription mismatch');
 }
 const olderModelConflict=!!r.olderModelGroups&&JSON.stringify(r.groups)!==JSON.stringify(r.olderModelGroups);
 return {...r,key:k,fullMarks:75,groups,slots,unitMarks,cognitiveMarks,olderModelConflict,bankCount:bank.length,missingAtLeast:slots.length?sum(slots.map(x=>x.missing)):sum(groups.map(x=>x.missing)),currentCdcExactApproved:false,readyForLive:false};
}
