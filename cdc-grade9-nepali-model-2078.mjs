/**
 * Grade 9 Nepali: CDC-authored 2078 feedback-copy reference, school mirror.
 * Grid printed pp.1–5 and model pp.7–14 visually inspected 2026-11-24.
 * Not evidence that the feedback copy is the approved 2083 examination grid.
 * No source passage, model prompt, or answer is reproduced.
 */
export const NEPALI_REFERENCE_URL='https://s3.veda-app.com/veda-app/assets/142/downloads/2023-05-22/MFiZlDg4rMshbLgC-1684763498.pdf';
const fields=[
 // [area, skill, cognitive level, offered alternatives, answer count, marks per answered choice, required component marks when applicable]
 [1,'vocabulary_matching','knowledge',1,1,2,[0.5,0.5,0.5,0.5]],
 [1,'vocabulary_identification','understanding',1,1,2,[0.5,0.5,0.5,0.5]],
 [1,'vocabulary_sentence_use','application',1,1,2,[1,1]],
 [2,'spelling_choice','knowledge',1,1,1,[0.5,0.5]],
 [2,'sentence_editing','application',1,1,2,[0.5,0.5,0.5,0.5]],
 [3,'word_class','application',1,1,3,[0.5,0.5,0.5,0.5,0.5,0.5]],
 [3,'word_formation','application',1,1,4,[2,2]],
 [3,'tense_aspect','application',1,1,2,[0.5,0.5,0.5,0.5]],
 [3,'verb_mood','application',1,1,2,[0.5,0.5,0.5,0.5]],
 [3,'sentence_transformation','application',1,1,4,[1,1,1,1]],
 [4,'grammar_passage','understanding',1,1,4,[1,1,1,1]],
 [4,'unseen_passage','understanding',1,1,5,[1,1,1,1,1]],
 [5,'guided_writing','application',2,1,4,null],
 [6,'functional_writing','application',2,1,4,null],
 [7,'notes_and_summary','higher',1,1,4,[2,2]],
 [8,'textbook_comprehension','understanding',3,2,4,[1,1,1,1]],
 [8,'reasoned_response','higher',1,1,4,null],
 [9,'interpretation','higher',2,1,4,null],
 [10,'critical_response','higher',2,1,7,null],
 [11,'essay','higher',3,1,7,null]
];
export function getNepali2078Reference(){
 const slots=fields.map(([area,skill,cognitiveLevel,offered,answerCount,marksPerChoice,components],i)=>({number:i+1,area,skill,cognitiveLevel,offered,answerCount,marksPerChoice,marks:answerCount*marksPerChoice,componentMarks:components?[...components]:null}));
 const areaMarks=Array.from({length:11},(_,i)=>slots.filter(s=>s.area===i+1).reduce((n,s)=>n+s.marks,0));
 const cognitiveMarks=Object.fromEntries(['knowledge','understanding','application','higher'].map(l=>[l,slots.filter(s=>s.cognitiveLevel===l).reduce((n,s)=>n+s.marks,0)]));
 if(areaMarks.join(',')!=='6,3,15,9,4,4,4,12,4,7,7'||slots.reduce((n,s)=>n+s.marks,0)!==75)throw Error('Nepali feedback-grid arithmetic mismatch');
 // Component marks above are equal-weight subdivisions inferred from the
 // number of model components, except explicitly printed 2+2 splits.
 // They are planning metadata, not a CDC answer-key marking scheme.
 return {grade:9,fullMarks:75,durationMinutes:180,sourceUrl:NEPALI_REFERENCE_URL,sourceType:'CDC 2078 feedback copy (school-hosted mirror)',gridPageNumbers:[1,2,3,4,5],modelPageNumbers:[7,8,9,10,11,12,13,14],slots,areaMarks,cognitiveMarks,componentMarksInferred:true,currentCdcExactApproved:false,readyForLive:false};
}
/** Validates grouped paper structure against the reference, never the truth
 * of its answers, textbook authenticity or current CDC approval. Each
 * choice must contain distinct content and a key before it can be used.
 */
export function checkNepali2078GroupedDraft(paper){
 const ref=getNepali2078Reference();
 const fail=message=>{throw Error('Nepali reference mismatch: '+message);};
 if(paper?.gradeNumber!==9||paper.fullMarks!==75||paper.durationMinutes!==180||!Array.isArray(paper.groups)||paper.groups.length!==20)fail('grade, time, marks or group count');
 const ids=new Set(),texts=new Set();
 for(const [i,s] of ref.slots.entries()){
  const g=paper.groups[i];
  if(!g||g.number!==s.number||g.skill!==s.skill||g.cognitiveLevel!==s.cognitiveLevel||g.answerCount!==s.answerCount||g.marks!==s.marks||!Array.isArray(g.choices)||g.choices.length!==s.offered)fail('group '+s.number+' structure or alternatives');
  for(const c of g.choices){
   const id=String(c?.id||'').trim(),text=String(c?.text||'').trim(),answer=String(c?.answer||'').trim();
   if(!id||ids.has(id)||!text||texts.has(text.replace(/\s+/g,' '))||!answer||c.marks!==s.marksPerChoice)fail('group '+s.number+' repeated, missing or incorrectly weighted choice');
   ids.add(id);texts.add(text.replace(/\s+/g,' '));
   if(s.componentMarks){
    if(!Array.isArray(c.components)||c.components.length!==s.componentMarks.length||c.components.some((p,j)=>!String(p?.text||'').trim()||!String(p?.answer||'').trim()||p.marks!==s.componentMarks[j]))fail('group '+s.number+' component structure');
   }
  }
 }
 return {referenceStructureMatched:true,fullMarks:75,groupCount:20,currentCdcExactApproved:false,teacherReviewRequired:true};
}
