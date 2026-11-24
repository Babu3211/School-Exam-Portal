/**
 * Standalone safe renderer for grouped Optional Math school paper.
 * Uses teacher-reviewed composite questions only. An exact CDC grid match
 * does NOT mean the questions were written or approved by Nepal CDC.
 */
import {cdcSubjectKey} from './cdc-grid-source-index.mjs';
const NE_DIGITS='०१२३४५६७८९';
const NE_LETTERS=['क','ख','ग','घ','ङ','च','छ','ज','झ','ञ','ट'];
const NE_SUBJECTS={nepali:'नेपाली',english:'अङ्ग्रेजी',math:'अनिवार्य गणित',science:'विज्ञान तथा प्रविधि',social:'सामाजिक अध्ययन',optional_math:'ऐच्छिक गणित',optional_computer:'ऐच्छिक कम्प्युटर विज्ञान',optional_environment:'वातावरण विज्ञान',optional_economics:'अर्थशास्त्र',accounting:'कार्यालय सञ्चालन तथा लेखा',health:'स्वास्थ्य, शारीरिक तथा सिर्जनात्मक कला'};
export const paperDigits=(value,language)=>language==='ne'?String(value??'').replace(/[0-9]/g,d=>NE_DIGITS[Number(d)]):String(value??'');
export const paperSubjectLabel=(subject,language)=>language==='ne'?(NE_SUBJECTS[cdcSubjectKey(subject)]||String(subject??'')):String(subject??'');
export const paperClassLabel=(value,language)=>paperDigits(language==='ne'?String(value??'').replace(/^Class\s*/i,'कक्षा '):value,language);
export const paperOptionLabel=(index,language,lower=false)=>language==='ne'?(NE_LETTERS[index]||paperDigits(index+1,language)):String.fromCharCode((lower?97:65)+index);
export const paperAnswerOption=(option,language)=>language==='ne'&&/^[A-D]$/.test(option||'')?paperOptionLabel(option.charCodeAt(0)-65,language):String(option??'');
// Computer program syntax must remain executable: preserve numeric literals
// in lines containing actual code expressions. All ordinary text/marks use Nepali digits.
export function paperDisplayText(value,language,subject){
 const text=String(value??'');
 if(language!=='ne')return text;
 if(cdcSubjectKey(subject)==='optional_computer'){
  return text.split('\n').map(line=>/\b(?:print|input|range|int|str|float)\s*\(|^\s*(?:if|elif|else|for|while)\b|\b[a-zA-Z_]\w*\s*=\s*\d|\b[a-zA-Z_]\w*\s*[+*/%\-]\s*\d/.test(line)?line:paperDigits(line,language)).join('\n');
 }
 return paperDigits(text,language);
}
const GROUPS=[
 ['objective','Group A — Objective (11 × 1 = 11)'],
 ['WCA','Group B — Within Content Area (12 questions, 40 marks)'],
 ['CCA','Group C — Cross Content Area (4 questions, 24 marks)']
];
export function renderCdcCompositePaper(paper,{escapeHtml,answerKey=false}={}){
 if(typeof escapeHtml!=='function'||paper?.questionFormat!=='cdc_optional_math_composite'||
  !['ne','en','both'].includes(paper?.language)||!Array.isArray(paper?.questions)||
  paper.questions.length!==27)throw Error('Validated composite paper required for printing');
 const ne=paper.language==='ne',esc=value=>escapeHtml(paperDisplayText(value,paper.language,paper.subject)),label=i=>paperOptionLabel(i,paper.language,true);
 const text=(x,tag)=>paper.language==='ne'?String(x[tag+'Ne']||''):
   paper.language==='en'?String(x[tag+'En']||''):
   String(x[tag+'Ne']||'')+'\n'+String(x[tag+'En']||'');
 const groups=GROUPS.map(([group,title])=>{
  const items=paper.questions.filter(q=>q.group===group);
  const needed=group==='objective'?11:group==='WCA'?12:4;
  const expected=group==='objective'?11:group==='WCA'?40:24;
  const marks=items.reduce((a,q)=>a+q.subquestions.reduce((n,s)=>n+Number(s.marks),0),0);
  if(items.length!==needed||marks!==expected)
   throw Error('CDC composite print group does not match exact grid');
  const titleNe={objective:'समूह क — वस्तुगत (11 × 1 = 11)',WCA:'समूह ख — विषयक्षेत्रभित्रका प्रश्न (12 प्रश्न, 40 अङ्क)',CCA:'समूह ग — अन्तरविषयक्षेत्रका प्रश्न (4 प्रश्न, 24 अङ्क)'};
  return {group,title:ne?titleNe[group]:title,items};
 });
 // CDC Grade 9/10 Model Question layout:
 // Q1 is a SINGLE objective question with parts A–K, not Q1–Q11.
 // WCA are Q2–Q13, CCA are Q14–Q17. There are 27 scored items but
 // 17 numbered main questions. Align print and answer key exactly.
 const optionsHtml=sub=>{
  const options=paper.language==='en'?sub.optionsEn:sub.optionsNe;
  if(answerKey||!Array.isArray(options)||options.length!==4)return '';
  return '<div style="padding-left:18px">'+options.map((value,i)=>
   '<div>'+label(i)+'. '+esc(value)+
   (paper.language==='both'&&Array.isArray(sub.optionsEn)?
    ' / '+esc(sub.optionsEn[i]||''):'')+'</div>').join('')+'</div>';
 };
 const objective=groups.find(x=>x.group==='objective');
 const within=groups.find(x=>x.group==='WCA');
 const cross=groups.find(x=>x.group==='CCA');
 const objectiveHtml='<h3 style="text-align:left;margin-top:18px">'+
   esc(objective.title)+'</h3>'+
  '<div class="qp-q" style="break-inside:avoid;page-break-inside:avoid">'+
  '<b>'+esc(1)+'. '+(answerKey?(ne?'उत्तरकुञ्जिका — ':'Teacher Answer Key — '):'')+
  (ne?'वस्तुगत प्रश्न':'Objective Questions')+' ['+esc(11)+']</b>'+
  objective.items.map((q,i)=>{
   const sub=q.subquestions[0];
   const prompt=esc(text(sub,answerKey?'answer':'text'));
   const key=answerKey&&sub.correctOption?
    ' ('+(ne?'सही विकल्प: ':'Correct option: ')+esc(paperAnswerOption(sub.correctOption,paper.language))+')':'';
   return '<div style="margin:10px 0 10px 18px;white-space:pre-line">'+
    '<b>'+paperOptionLabel(i,paper.language)+'.</b> '+prompt+key+
    (answerKey?'':' <b>['+esc(1)+']</b>')+optionsHtml(sub)+'</div>';
  }).join('')+'</div>';
 const groupedHtml=(group,startingNumber)=>
  '<h3 style="text-align:left;margin-top:18px">'+esc(group.title)+'</h3>'+
  group.items.map((q,index)=>{
   const number=startingNumber+index;
   const mark=q.subquestions.reduce((total,s)=>total+Number(s.marks),0);
   const context=text(q,'context').trim();
   const contextHtml=context?'<p style="white-space:pre-line;margin:5px 0">'+
    esc(context)+'</p>':'';
   const subparts=q.subquestions.map((sub,i)=>
    '<li style="margin:6px 0;white-space:pre-line">'+
    label(i)+'. '+
    esc(text(sub,answerKey?'answer':'text'))+
    (answerKey?'':' <b>['+esc(sub.marks)+']</b>')+
    optionsHtml(sub)+'</li>').join('');
   return '<div class="qp-q" style="break-inside:avoid;page-break-inside:avoid;margin:13px 0">'+
    '<b>'+esc(number)+'. '+(answerKey?(ne?'[उत्तरकुञ्जिका] ':'[Answer Key] '):'')+
    '<span>['+esc(mark)+']</span></b>'+contextHtml+
    '<ol style="list-style:none;padding-left:16px;margin:5px 0">'+subparts+
    '</ol></div>';
  }).join('');
 const html=objectiveHtml+groupedHtml(within,2)+groupedHtml(cross,14);
 const header='<div style="text-align:center;border-bottom:1px solid #222;padding-bottom:12px">'+
  '<h2>'+esc(paper.schoolName||'विद्यालय')+'</h2><p>'+esc(paper.schoolAddress||'')+'</p>'+
  '<h3>'+esc(paper.paperTitle||'प्रश्नपत्र')+(answerKey?(ne?' — उत्तरकुञ्जिका':' — Teacher Answer Key'):'')+'</h3>'+
  '<b>'+esc(paperClassLabel(paper.className,paper.language))+' · '+esc(paperSubjectLabel(paper.subject,paper.language))+'</b>'+
  '<div style="display:flex;justify-content:space-between;margin-top:10px;gap:10px">'+
  '<span>'+(ne?'शैक्षिक वर्ष: ':'Year: ')+esc(paper.academicYear)+'</span><span>'+(ne?'समय: ':'Time: ')+esc(paper.durationMinutes)+
  (ne?' मिनेट':' minutes')+'</span><span>'+(ne?'पूर्णाङ्क: ':'FM: ')+esc(paper.fullMarks)+'</span></div></div>';
 const note='<p style="font-size:12px;color:#444;margin:10px 0">'+
  (ne?'CDC २०८२ को संरचना — विद्यालयका मौलिक गणित अभ्यास। CDC प्रकाशित प्रश्न होइनन्; शिक्षक समीक्षा आवश्यक।':'CDC 2082 Grid structure — SMSS original calculated practice questions. NOT CDC-published; teacher answer and curriculum review required.')+
  '</p>';
 return '<section '+(answerKey?'':'id="qpPrintArea"')+
  ' class="qp-paper-preview" style="font-family:Arial,sans-serif">'+
  header+note+html+'</section>';
}
