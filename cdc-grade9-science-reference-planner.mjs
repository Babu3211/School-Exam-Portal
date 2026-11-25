/** Grade 9 science historical reference only. CDC 2078 grid and checklist
 * visually checked on the Hupen mirror; newer approved grid still needed.
 * SMSS never silently substitutes newer Mushroom / Agriculture units for
 * old Life Cycle / Chemicals Used in Daily Life. Every answer element is
 * one mark, including mixed cognitive elements within a 2/4-mark question.
 * Nominal question-level counts and actual element-level marks are checked.
 */
import {auditGrade9ScienceArchive} from './cdc-grade9-science-archive-audit.mjs';
export const SCIENCE_ARCHIVE_MIRROR='https://hupen.com.np/files/Class-9-Science-Grid-And-Model-Question_1754407135.pdf';
const LEVELS=['knowledge','understanding','application','higher'];
const UNIT_GROUPS=[[1,13],[2,3,4,5,6],[7,8,9,10,11,12],[14,15,16,17,18,19]];
const str=x=>String(x??'').trim();
const norm=x=>str(x).normalize('NFC').replace(/\s+/g,' ');
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const require=(ok,msg)=>{if(!ok)throw Error('Science reference mismatch: '+msg);};
export function getScience2078Reference({grade,subject}={}){
 const a=auditGrade9ScienceArchive({grade,subject});if(!a)return null;
 const g=a.archivedModel;
 return {grade,subject,fullMarks:75,durationMinutes:180,totalQuestionCount:40,sourceUrl:g.officialArchiveUrl,mirrorUrl:SCIENCE_ARCHIVE_MIRROR,mirrorGridVisualChecked:true,mirrorChecklistPrintedTotal:75,unitToleranceMarks:2,groups:g.groups.map(x=>({...x,levelCounts:[...x.levelCounts]})),cognitiveMarks:[...g.cognitiveMarks],contentGroups:UNIT_GROUPS.map((units,i)=>({units:[...units],marks:g.groupMarks[i]})),units:g.unitNames.map((title,i)=>({unitCode:String(i+1),title,marks:g.unitMarks[i]})),currentCdcExactApproved:false};
}
function inspect(q,r,language,topics){
 if(!q||q.gradeNumber!==9||q.subject!==r.subject||q.status==='archived'||q.reviewStatus!=='teacher_reviewed'||!str(q.reviewedBy)||!str(q.id)||!topics.has(q.topicId))return null;
 const unit=r.units.find(u=>u.unitCode===str(q.unitCode));
 const group=r.groups.find(g=>g.code===q.questionType),level=LEVELS.indexOf(q.cognitiveLevel);
 if(!unit||q.referenceUnitTitle!==unit.title||q.sourceYearBS!==2078||!group||q.marks!==group.marksEach||level<0)return null;
 const present=(ne,en)=>language==='ne'?!!str(ne):language==='en'?!!str(en):!!str(ne)&&!!str(en);
 if(!present(q.questionText,q.questionTextEn)||!present(q.answer,q.answerEn)||!Array.isArray(q.elements)||q.elements.length!==q.marks)return null;
 const actual=[0,0,0,0];
 for(const e of q.elements){const i=LEVELS.indexOf(e.cognitiveLevel);if(i<0||e.marks!==1||!present(e.answerNe,e.answerEn))return null;actual[i]++;}
 if(q.marks===1&&actual[level]!==1)return null;
 if(q.questionType==='mcq'){
  const valid=(opts,key)=>Array.isArray(opts)&&opts.length===4&&opts.every(str)&&new Set(opts.map(norm)).size===4&&norm(opts['ABCD'.indexOf(q.correctOption)])===norm(key);
  if(!['A','B','C','D'].includes(q.correctOption)||(language!=='en'&&!valid(q.options,q.answer))||(language!=='ne'&&!valid(q.optionsEn,q.answerEn)))return null;
 }
 return {q,id:str(q.id),family:str(q.variantFamily)||str(q.id),text:norm(language==='en'?q.questionTextEn:q.questionText),unit:Number(unit.unitCode)-1,content:UNIT_GROUPS.findIndex(xs=>xs.includes(Number(unit.unitCode))),type:group.code,level,marks:q.marks,actual};
}
function validateTotals(rows,r,topics){
 const units=Array(19).fill(0),content=Array(4).fill(0),cog=Array(4).fill(0);
 const typeCounts=Object.fromEntries(r.groups.map(g=>[g.code,[0,0,0,0]]));
 const ids=new Set(),texts=new Set(),families=new Set();
 for(const x of rows){require(!ids.has(x.id)&&!texts.has(x.text)&&!families.has(x.family),'duplicate question or variant family');ids.add(x.id);texts.add(x.text);families.add(x.family);units[x.unit]+=x.marks;content[x.content]+=x.marks;typeCounts[x.type][x.level]++;x.actual.forEach((m,i)=>cog[i]+=m);}
 require(rows.length===40&&sum(units)===75,'question count or full marks');
 require(r.units.every((u,i)=>units[i]>0&&Math.abs(units[i]-u.marks)<=2),'unit marks, tolerance or missing unit');
 require(r.contentGroups.every((g,i)=>content[i]===g.marks),'content group marks');
 require(r.groups.every(g=>g.levelCounts.every((n,i)=>n===typeCounts[g.code][i])),'question type/cognitive count');
 require(r.cognitiveMarks.every((n,i)=>n===cog[i]),'answer element cognitive marks');
 require([...topics].every(t=>rows.some(x=>x.q.topicId===t)),'selected topic coverage');
 return {unitMarks:units,contentMarks:content,cognitiveMarks:cog,typeCounts};
}
export function assertScience2078ReferencePaper(paper){
 const r=getScience2078Reference({grade:paper?.gradeNumber,subject:paper?.subject});
 require(r&&paper.fullMarks===75&&paper.durationMinutes===180&&['ne','en','both'].includes(paper.language)&&Array.isArray(paper.questions)&&Array.isArray(paper.topicIds)&&paper.topicIds.length,'scope, time or topics');
 const topics=new Set(paper.topicIds),rows=paper.questions.map(q=>inspect(q,r,paper.language,topics));
 require(rows.every(Boolean),'unreviewed question, incorrect historical unit, missing element, language or options');
 return {...validateTotals(rows,r,topics),referenceStructureMatched:true,currentCdcExactApproved:false,teacherReviewRequired:true};
}
const signature=rows=>rows.map(x=>x.id).sort().join('|');
function shuffle(pool,rng){const a=[...pool];for(let i=a.length-1;i>0;i--){const v=rng();if(!Number.isFinite(v)||v<0||v>=1)throw Error('Invalid random source');const j=Math.floor(v*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function planScience2078ReferencePaper({grade,subject,fullMarks=75,durationMinutes=180,language='both',questions=[],selectedTopicIds=[],previousSignature='',avoidSignatures=[],rng=Math.random,maxVisits=150000}={}){
 const r=getScience2078Reference({grade,subject});
 require(r&&fullMarks===75&&durationMinutes===180&&['ne','en','both'].includes(language),'Grade 9 science 75-mark reference required');
 require(Array.isArray(questions)&&questions.length<=5000&&Array.isArray(selectedTopicIds)&&Array.isArray(avoidSignatures)&&avoidSignatures.length<=30&&avoidSignatures.every(x=>typeof x==='string')&&Number.isSafeInteger(maxVisits)&&maxVisits>0&&maxVisits<=200000,'bank or search options');
 const topics=new Set(selectedTopicIds),bank=questions.map(q=>inspect(q,r,language,topics)).filter(Boolean);
 const cells=r.groups.flatMap(g=>g.levelCounts.map((n,level)=>({type:g.code,level,n,pool:shuffle(bank.filter(x=>x.type===g.code&&x.level===level),rng)}))).filter(x=>x.n>0);
 const shortages=cells.filter(c=>new Set(c.pool.map(x=>x.family)).size<c.n).map(c=>({type:c.type,level:LEVELS[c.level],required:c.n,available:new Set(c.pool.map(x=>x.id)).size}));
 const missingUnits=r.units.filter((u,i)=>!bank.some(x=>x.unit===i)).map(u=>u.unitCode);
 const no=reason=>({ready:false,reason,shortages,missingUnits,currentCdcExactApproved:false,readyForLive:false});
 if(shortages.length||missingUnits.length||!topics.size||topics.size>40)return no('Missing eligible historical unit or reviewed questions');
 cells.sort((a,b)=>a.pool.length/a.n-b.pool.length/b.n);
 const slots=cells.flatMap((c,i)=>Array.from({length:c.n},()=>i)),used=new Set(),texts=new Set(),families=new Set(),chosen=[],unit=Array(19).fill(0),content=Array(4).fill(0),cog=Array(4).fill(0),banned=new Set([previousSignature,...avoidSignatures].filter(Boolean));
 let visits=0;
 function dfs(step,start){
  if(++visits>maxVisits)throw Error('Science reference search exceeded safe limit');
  if(step===slots.length){
   if(banned.has(signature(chosen)))return false;
   try{validateTotals(chosen,r,topics);return true;}catch{return false;}
  }
  const cell=cells[slots[step]],last=slots[step+1]!==slots[step];
  // Prune branches without enough distinct unused families in this cell.
  let need=0;for(let k=step;k<slots.length&&slots[k]===slots[step];k++)need++;
  if(new Set(cell.pool.slice(start).filter(x=>!used.has(x.id)&&!texts.has(x.text)&&!families.has(x.family)).map(x=>x.family)).size<need)return false;
  for(let i=start;i<cell.pool.length;i++){
   const x=cell.pool[i];
   if(used.has(x.id)||texts.has(x.text)||families.has(x.family)||unit[x.unit]+x.marks>r.units[x.unit].marks+2||content[x.content]+x.marks>r.contentGroups[x.content].marks||x.actual.some((m,k)=>cog[k]+m>r.cognitiveMarks[k]))continue;
   used.add(x.id);texts.add(x.text);families.add(x.family);chosen.push(x);unit[x.unit]+=x.marks;content[x.content]+=x.marks;x.actual.forEach((m,k)=>cog[k]+=m);
   if(dfs(step+1,last?0:i+1))return true;
   used.delete(x.id);texts.delete(x.text);families.delete(x.family);chosen.pop();unit[x.unit]-=x.marks;content[x.content]-=x.marks;x.actual.forEach((m,k)=>cog[k]-=m);
  }
  return false;
 }
 if(!dfs(0,0))return no('No complete different paper matches the reference constraints');
 const paper={gradeNumber:9,subject,fullMarks,durationMinutes,language,topicIds:[...topics],questions:structuredClone(chosen.map(x=>x.q).sort((a,b)=>r.groups.findIndex(g=>g.code===a.questionType)-r.groups.findIndex(g=>g.code===b.questionType)))};
 return {ready:true,paper,signature:signature(chosen),...assertScience2078ReferencePaper(paper),referenceOnly:true,readyForLive:false,sourceUrl:r.sourceUrl};
}
