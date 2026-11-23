/**
 * Standalone safe renderer for grouped Optional Math school paper.
 * Uses teacher-reviewed composite questions only. An exact CDC grid match
 * does NOT mean the questions were written or approved by Nepal CDC.
 */
const GROUPS=[
 ['objective','Group A — Objective (11 × 1 = 11)'],
 ['WCA','Group B — Within Content Area (12 questions, 40 marks)'],
 ['CCA','Group C — Cross Content Area (4 questions, 24 marks)']
];
export function renderCdcCompositePaper(paper,{escapeHtml,answerKey=false}={}){
 if(typeof escapeHtml!=='function'||paper?.questionFormat!=='cdc_optional_math_composite'||
  !['ne','en','both'].includes(paper?.language)||!Array.isArray(paper?.questions)||
  paper.questions.length!==27)throw Error('Validated composite paper required for printing');
 const esc=value=>escapeHtml(String(value??''));
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
  return {group,title,items};
 });
 // CDC Grade 9/10 Model Question layout:
 // Q1 is a SINGLE objective question with parts A–K, not Q1–Q11.
 // WCA are Q2–Q13, CCA are Q14–Q17. There are 27 scored items but
 // 17 numbered main questions. Align print and answer key exactly.
 const optionsHtml=sub=>{
  const options=paper.language==='en'?sub.optionsEn:sub.optionsNe;
  if(answerKey||!Array.isArray(options)||options.length!==4)return '';
  return '<div style="padding-left:18px">'+options.map((value,i)=>
   '<div>'+String.fromCharCode(97+i)+'. '+esc(value)+
   (paper.language==='both'&&Array.isArray(sub.optionsEn)?
    ' / '+esc(sub.optionsEn[i]||''):'')+'</div>').join('')+'</div>';
 };
 const objective=groups.find(x=>x.group==='objective');
 const within=groups.find(x=>x.group==='WCA');
 const cross=groups.find(x=>x.group==='CCA');
 const objectiveHtml='<h3 style="text-align:left;margin-top:18px">'+
   esc(objective.title)+'</h3>'+
  '<div class="qp-q" style="break-inside:avoid;page-break-inside:avoid">'+
  '<b>1. '+(answerKey?'Teacher Answer Key — ':'')+
  'Objective Questions [11]</b>'+
  objective.items.map((q,i)=>{
   const sub=q.subquestions[0];
   const prompt=esc(text(sub,answerKey?'answer':'text'));
   const key=answerKey&&sub.correctOption?
    ' (Correct option: '+esc(sub.correctOption)+')':'';
   return '<div style="margin:10px 0 10px 18px;white-space:pre-line">'+
    '<b>'+String.fromCharCode(65+i)+'.</b> '+prompt+key+
    (answerKey?'':' <b>[1]</b>')+optionsHtml(sub)+'</div>';
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
    String.fromCharCode(97+i)+'. '+
    esc(text(sub,answerKey?'answer':'text'))+
    (answerKey?'':' <b>['+esc(sub.marks)+']</b>')+
    optionsHtml(sub)+'</li>').join('');
   return '<div class="qp-q" style="break-inside:avoid;page-break-inside:avoid;margin:13px 0">'+
    '<b>'+esc(number)+'. '+(answerKey?'[Answer Key] ':'')+
    '<span>['+esc(mark)+']</span></b>'+contextHtml+
    '<ol style="list-style:none;padding-left:16px;margin:5px 0">'+subparts+
    '</ol></div>';
  }).join('');
 const html=objectiveHtml+groupedHtml(within,2)+groupedHtml(cross,14);
 const header='<div style="text-align:center;border-bottom:1px solid #222;padding-bottom:12px">'+
  '<h2>'+esc(paper.schoolName||'विद्यालय')+'</h2><p>'+esc(paper.schoolAddress||'')+'</p>'+
  '<h3>'+esc(paper.paperTitle||'प्रश्नपत्र')+(answerKey?' — Teacher Answer Key':'')+'</h3>'+
  '<b>'+esc(paper.className)+' · '+esc(paper.subject)+'</b>'+
  '<div style="display:flex;justify-content:space-between;margin-top:10px;gap:10px">'+
  '<span>Year: '+esc(paper.academicYear)+'</span><span>Time: '+esc(paper.durationMinutes)+
  ' minutes</span><span>FM: '+esc(paper.fullMarks)+'</span></div></div>';
 const note='<p style="font-size:12px;color:#444;margin:10px 0">'+
  'CDC 2082 Grid structure — SMSS original calculated practice questions. NOT CDC-published; teacher answer and curriculum review required.'+
  '</p>';
 return '<section '+(answerKey?'':'id="qpPrintArea"')+
  ' class="qp-paper-preview" style="font-family:Arial,sans-serif">'+
  header+note+html+'</section>';
}
