/** V46 Grade 9 examination guard. Independently rechecks the generated
 * paper, not its self-declared exactGridMatched flag. No data mutation.
 * Only bundled CDC structures are accepted; historical/practice/admin-only
 * grids do not certify an official examination.
 */
import {getBundledComputerGrid} from './cdc-verified-computer-grids.mjs';
import {getCdcOptionalMathGuide} from './cdc-optional-math-2082.mjs';
import {validateExactCdcUnitGrid} from './cdc-exact-grid.mjs';
const levels=['knowledge','understanding','application','higher'];
const str=x=>String(x??'').trim();
const distinctOptions=x=>Array.isArray(x)&&x.length===4&&x.every(v=>typeof v==='string'&&str(v))&&new Set(x.map(v=>str(v).normalize('NFC').replace(/\s+/g,' '))).size===4;
const nepali=/[\u0900-\u097F]/;
const sum=(a,f)=>a.reduce((n,x)=>n+f(x),0);
const countMap=(keys)=>Object.fromEntries(keys.map(k=>[k,0]));
const require=(ok,msg)=>{if(!ok)throw Error('CDC Grid mismatch: '+msg);};
const key=(unit,type,marks,level)=>[unit,type,marks,level].join('|');
export function grade9VerifiedExamStructure({grade,subject,fullMarks}={}){
 if(grade!==9)return null;
 const computer=getBundledComputerGrid({grade,subject,fullMarks});
 if(computer)return {kind:'unit',grid:computer};
 const math=getCdcOptionalMathGuide({grade,subject});
 if(math&&Number(fullMarks)===75)return {kind:'composite',grid:math};
 return null;
}
export function assertGrade9ExamPaperMatches(paper){
 if(Number(paper?.gradeNumber)!==9)return true;
 const structure=grade9VerifiedExamStructure({grade:9,subject:paper.subject,fullMarks:Number(paper.fullMarks)});
 require(structure,'verified subject and full marks unavailable');
 const {kind,grid}=structure,qs=paper.questions;
 require(['ne','en','both'].includes(paper.language),'language');
 require(Number(paper.durationMinutes)===grid.durationMinutes,'exam duration');
 require(Array.isArray(qs)&&qs.length>0,'questions missing');
 require(qs.every(q=>str(q.questionId))&&new Set(qs.map(q=>str(q.questionId))).size===qs.length,'duplicate or missing question ID');
 if(kind==='unit'){
  const expected=validateExactCdcUnitGrid(grid,Number(paper.fullMarks),{gradeNumber:9,subject:paper.subject}).slots;
  require(qs.length===expected.length,'question count');
  const counts=new Map();
  for(const s of expected){const k=key(s.unitCode,s.type,s.marks,s.cognitiveLevel);counts.set(k,(counts.get(k)||0)+1);}
  for(const q of qs){
   const e=q.gridEvidence;
   require(e&&str(e.questionId)===str(q.questionId)&&e.questionType===q.questionType&&
    Number(e.marks)===Number(q.marks)&&e.cognitiveLevel===q.cognitiveLevel&&
    str(e.topicId)&&Array.isArray(paper.topicIds)&&paper.topicIds.includes(e.topicId),'slot evidence or selected topic missing');
   require(str(q.questionText)&&str(q.answer),'question or answer missing');
   if(paper.language==='en')require(!nepali.test(q.questionText)&&!nepali.test(q.answer),'English question or answer contains untranslated text');
   if(q.questionType==='mcq')require(distinctOptions(q.options)&&['A','B','C','D'].includes(q.correctOption)&&(paper.language!=='en'||q.options.every(o=>!nepali.test(o))),'MCQ options or key');
   const k=key(str(e.unitCode),q.questionType,Number(q.marks),q.cognitiveLevel);
   require((counts.get(k)||0)>0,'unit, question type, marks or cognitive level');
   counts.set(k,counts.get(k)-1);
  }
  require([...counts.values()].every(x=>x===0)&&sum(qs,q=>Number(q.marks))===Number(paper.fullMarks),'remaining grid slots or full marks');
 }else{
  require(paper.questionFormat==='cdc_optional_math_composite'&&qs.length===27,'composite groups required');
  const codes=grid.areas.map(a=>a.unitCode), groupCodes=grid.questionGroups.map(g=>g.code);
  const groups=countMap(groupCodes),groupMarks=countMap(groupCodes),areaMarks=countMap(codes),objectives=countMap(codes),wca=countMap(codes),cognitive=countMap(levels);
  const lang=paper.language;
  require(['ne','en','both'].includes(lang),'language');
  const present=(ne,en)=>lang==='ne'?!!str(ne):lang==='en'?!!str(en):!!str(ne)&&!!str(en);
  for(const q of qs){
   require(groupCodes.includes(q.group)&&Array.isArray(q.subquestions),'unknown group or subquestions missing');
   const obj=q.group==='objective',parts=q.subquestions;
   require(obj?parts.length===1&&parts[0].marks===1:parts.length>=2&&parts.length<=4&&present(q.contextNe,q.contextEn),'group context or subquestion count');
   const groupTotal=sum(parts,s=>Number(s.marks));
   require(groupTotal<=12&&(obj?groupTotal===1:q.group==='CCA'?groupTotal>=3:groupTotal>=2),'individual group marks');
   const touched=new Set();
   for(const s of parts){
    const code=str(s.unitCode),marks=Number(s.marks);
    require(codes.includes(code)&&levels.includes(s.cognitiveLevel)&&Number.isSafeInteger(s.marks)&&marks>=1&&marks<=10&&present(s.textNe,s.textEn)&&present(s.answerNe,s.answerEn),'subquestion unit, marks, language or answer');
    touched.add(code);areaMarks[code]+=marks;cognitive[s.cognitiveLevel]+=marks;groupMarks[q.group]+=marks;
    if(s.optionsNe!==undefined||s.optionsEn!==undefined){
     const opts=distinctOptions;
     require(['A','B','C','D'].includes(s.correctOption)&&(lang==='ne'?opts(s.optionsNe):lang==='en'?opts(s.optionsEn):opts(s.optionsNe)&&opts(s.optionsEn)),'objective choices or key');
    }
   }
   require(q.group==='CCA'?touched.size>=2:touched.size===1,'within/cross content area');
   groups[q.group]++;
   if(obj)objectives[[...touched][0]]++;
   if(q.group==='WCA')wca[[...touched][0]]++;
  }
  for(const g of grid.questionGroups)require(groups[g.code]===g.questionCount&&groupMarks[g.code]===g.totalMarks,'group '+g.code+' count or marks');
  for(const a of grid.areas)require(areaMarks[a.unitCode]===a.totalMarks&&objectives[a.unitCode]===a.objectiveCount&&wca[a.unitCode]===a.wcaQuestionCount,'area '+a.unitCode+' allocation');
  for(const l of levels)require(Math.abs(cognitive[l]-grid.fullMarks*grid.cognitiveDistribution[l]/100)<=grid.compositeRules.cognitiveMarksTolerance,'cognitive marks '+l);
 }
 return true;
}
