// Export the verified, currently displayed practice preview, never an official paper.
import {buildQuestionPaperDocx,rasterizePaperFigures} from './cdc-optional-math-render.mjs';
const NOTICE='UNREVIEWED ORIGINAL PRACTICE — NOT AN OFFICIAL CDC QUESTION PAPER';
const digits=(n,language)=>language==='ne'?String(n).replace(/\d/g,d=>'०१२३४५६७८९'[Number(d)]):String(n);
export async function exportPracticeDocx({document:doc,paper,assertCurrent}){
 if(!doc||!paper||paper.official!==false||paper.approved!==false||paper.writeAuthorized!==false||paper.teacherReviewRequired!==true||typeof assertCurrent!=='function')throw Error('Verified practice preview required');
 assertCurrent();
 if(!doc.body?.textContent.includes(NOTICE))throw Error('Practice warning missing');
 let area;
 const make=(tag,text,parent)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(parent)parent.append(node);return node;};
 if(paper.questionFormat==='cdc_optional_math_composite'){
  const original=doc.querySelector('.qp-paper-preview');
  if(!original||!original.querySelector('.qp-paper-body'))throw Error('Composite preview unavailable');
  area=original.cloneNode(true);
  const note=make('p',NOTICE);
  area.insertBefore(note,area.querySelector('.qp-paper-body'));
 }else{
  const source=doc.querySelector('main.sheet > ol');
  if(!source||source.children.length!==paper.questionCount)throw Error('Practice question count changed');
  area=make('section');const header=make('header',undefined,area);
  make('h1',paper.schoolName,header);make('h2','Class '+paper.grade+' · '+paper.subject,header);
  make('p',NOTICE,area);make('p','Questions: '+paper.questionCount+' | Total marks: '+paper.totalMarks,area);
  const body=make('div',undefined,area);body.className='qp-paper-body';
  for(const [i,li] of [...source.children].entries()){
   const q=paper.questions[i],block=make('div',undefined,body);block.className='qp-q';
   const text=li.firstElementChild?.textContent;
   if(!text||!text.includes(q.questionText))throw Error('Practice question changed');
   make('p',digits(i+1,paper.language)+'. '+text,block);
   const options=li.querySelector(':scope > ol');
   if(options){for(const [j,option] of [...options.children].entries())make('p',(paper.language==='ne'?'कखगघ'[j]:'ABCD'[j])+'. '+option.textContent,block)}
   const answer=li.querySelector(':scope > .answer');if(answer)make('p',answer.textContent,block);
  }
 }
 const figurePngs=await rasterizePaperFigures(area);
 assertCurrent();
 const bytes=buildQuestionPaperDocx(area,{figurePngs});
 assertCurrent();
 return bytes;
}
