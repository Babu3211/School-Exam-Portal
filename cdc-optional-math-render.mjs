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
 let questionNumber=0;
 const html=groups.map(({group,title,items})=>
  '<h3 style="text-align:left;margin-top:18px">'+esc(title)+'</h3>'+
  items.map(q=>{
   const no=++questionNumber,mark=q.subquestions.reduce((a,s)=>a+s.marks,0);
   const context=text(q,'context').trim();
   const prompt=context?'<p style="white-space:pre-line;margin:5px 0">'+esc(context)+'</p>':'';
   const subs=q.subquestions.map((s,i)=>{
    const label=String.fromCharCode(97+i)+')';
    const words=text(s,answerKey?'answer':'text');
    const suffix=answerKey?'':' <strong>['+esc(s.marks)+']</strong>';
    const opts=(!answerKey&&Array.isArray(s.optionsNe)&&s.optionsNe.length===4)?
     '<div style="padding-left:10px">'+s.optionsNe.map((o,index)=>
      '<div>'+String.fromCharCode(65+index)+'. '+esc(o)+
       (paper.language==='both'&&Array.isArray(s.optionsEn)?' / '+esc(s.optionsEn[index]||''):'')+
       '</div>').join('')+'</div>':'';
    return '<li style="white-space:pre-line;margin:6px 0">'+esc(label)+' '+
     esc(words)+suffix+opts+'</li>';
   }).join('');
   return '<div class="qp-q" style="break-inside:avoid;page-break-inside:avoid;margin:13px 0">'+
    '<b>'+esc(no)+'. '+(answerKey?'[Answer Key] ':'')+
    '<span>['+esc(mark)+']</span></b>'+prompt+
    '<ol style="list-style:none;padding-left:16px;margin:5px 0">'+subs+'</ol></div>';
  }).join('')).join('');
 const header='<div style="text-align:center;border-bottom:1px solid #222;padding-bottom:12px">'+
  '<h2>'+esc(paper.schoolName||'विद्यालय')+'</h2><p>'+esc(paper.schoolAddress||'')+'</p>'+
  '<h3>'+esc(paper.paperTitle||'प्रश्नपत्र')+(answerKey?' — Teacher Answer Key':'')+'</h3>'+
  '<b>'+esc(paper.className)+' · '+esc(paper.subject)+'</b>'+
  '<div style="display:flex;justify-content:space-between;margin-top:10px;gap:10px">'+
  '<span>Year: '+esc(paper.academicYear)+'</span><span>Time: '+esc(paper.durationMinutes)+
  ' minutes</span><span>FM: '+esc(paper.fullMarks)+'</span></div></div>';
 const note='<p style="font-size:12px;color:#444;margin:10px 0">'+
  'CDC 2082 Specification Grid structure — SMSS school-reviewed questions (not a CDC published question paper)'+
  '</p>';
 return '<section '+(answerKey?'':'id="qpPrintArea"')+
  ' class="qp-paper-preview" style="font-family:Arial,sans-serif">'+
  header+note+html+'</section>';
}
