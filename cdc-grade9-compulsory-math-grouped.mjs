/** Grade 9 compulsory math reference planner.
 * Government 2078 chart text and mirror page 1 checked 2026-11-24.
 * Current approved 2083 applicability is NOT established.
 * Strictly use published area-level marks and item counts, not invented
 * model subpart allocations. Zero deviation is the SMSS planning policy;
 * the reference itself allows up to two marks of cognitive variation.
 */
import {auditCompulsoryMathArchive} from './cdc-grade9-compulsory-math-practice.mjs';
export const MATH_REFERENCE_MIRROR='https://dblimbu.com.np/site-assets/uploads/2026/09/Specification-Grid-Mathematics-9.pdf';
const levels=['knowledge','understanding','application','higher'];
const counts=[[1,1,1,1],[2,2,3,2],[2,2,2,2],[2,2,3,1],[2,2,2,2],[2,2,2,2],[1,1,1,1]];
const str=x=>String(x??'').trim();
const norm=x=>str(x).normalize('NFC').replace(/\s+/g,' ');
const sum=a=>a.reduce((n,x)=>n+x,0);
export function getGrade9MathReference({grade,subject}={}){
 const a=auditCompulsoryMathArchive({grade,subject});if(!a)return null;
 const areas=a.areas.map((x,i)=>({...x,itemsByLevel:Object.fromEntries(levels.map((l,j)=>[l,counts[i][j]])),marksByLevel:Object.fromEntries(levels.map((l,j)=>[l,x.levels[j]]))}));
 if(areas.some(x=>sum(Object.values(x.itemsByLevel))!==x.items)||JSON.stringify(levels.map(l=>sum(areas.map(x=>x.itemsByLevel[l]))))!=='[12,12,14,11]')throw Error('Historical item counts inconsistent');
 return {...a,areas,mirrorUrl:MATH_REFERENCE_MIRROR,gridCognitiveToleranceMarks:2,smssCognitiveToleranceMarks:0,visualGridChecked:true};
}
const require=(ok,msg)=>{if(!ok)throw Error('Compulsory math reference mismatch: '+msg);};
const languageOK=(ne,en,lang)=>lang==='ne'?!!str(ne):lang==='en'?!!str(en):!!str(ne)&&!!str(en);
function inspect(q,ref,subject,lang,topics,allowDraft=false){
 const reviewed=q?.reviewStatus==='teacher_reviewed'&&str(q.reviewedBy);
 const draft=allowDraft&&q?.bundled===true&&q?.reviewStatus==='draft'&&q?.teacherReviewRequired===true&&q?.sourceStatus==='SMSS_original_reference_draft'&&q?.officialCdcQuestion===false;
 if(!q||q.gradeNumber!==9||q.subject!==subject||!str(q.id)||!topics.has(q.topicId)||q.status==='archived'||(!reviewed&&!draft)||!languageOK(q.contextNe,q.contextEn,lang)||!Array.isArray(q.subquestions)||!q.subquestions.length)return null;
 const area=ref.areas.find(a=>a.unitCode===String(q.unitCode));if(!area)return null;
 const items=levels.map(()=>0),marks=levels.map(()=>0);
 for(const p of q.subquestions){
  const k=levels.indexOf(p.cognitiveLevel);
  if(k<0||!Number.isSafeInteger(p.marks)||p.marks<1||p.marks>area.marks||!languageOK(p.textNe,p.textEn,lang)||!languageOK(p.answerNe,p.answerEn,lang))return null;
  items[k]++;marks[k]+=p.marks;
 }
 if(levels.some((l,i)=>items[i]>area.itemsByLevel[l]||marks[i]>area.marksByLevel[l]))return null;
 return {q,items,marks,family:str(q.variantFamily)||str(q.id),area:area.unitCode,id:str(q.id),context:norm(lang==='en'?q.contextEn:q.contextNe)};
}
const sig=qs=>qs.map(q=>str(q.id)).sort().join('|');
export function assertGrade9MathReferencePaper(paper,{allowOriginalReferenceDraft=false}={}){
 const r=getGrade9MathReference({grade:paper?.gradeNumber,subject:paper?.subject});
 require(r&&paper.fullMarks===75&&paper.durationMinutes===180&&['ne','en','both'].includes(paper.language)&&Array.isArray(paper.groups)&&paper.groups.length===16,'scope, time, marks or groups');
 require(Array.isArray(paper.topicIds)&&paper.topicIds.length,'selected topics missing');
 const topics=new Set(paper.topicIds),ids=new Set(),contexts=new Set(),families=new Set();
 const rows=paper.groups.map(q=>{const a=inspect(q,r,paper.subject,paper.language,topics,allowOriginalReferenceDraft&&paper.referenceOnly===true);require(a&&!ids.has(a.id)&&!contexts.has(a.context)&&!families.has(a.family),'invalid, duplicate or unreviewed group');ids.add(a.id);contexts.add(a.context);families.add(a.family);return a;});
 for(const a of r.areas){
  const group=rows.filter(x=>x.area===a.unitCode);
  require(group.length===a.groups,'area '+a.unitCode+' question count');
  for(const [i,l] of levels.entries())require(sum(group.map(x=>x.items[i]))===a.itemsByLevel[l]&&sum(group.map(x=>x.marks[i]))===a.marksByLevel[l],'area '+a.unitCode+' '+l+' item/mark distribution');
 }
 require([...topics].every(t=>paper.groups.some(q=>q.topicId===t)),'topic coverage');
 return {referenceStructureMatched:true,currentCdcExactApproved:false,teacherReviewRequired:true,groupCount:16,itemCount:49,fullMarks:75};
}
function shuffle(pool,rng){const a=[...pool];for(let i=a.length-1;i>0;i--){const v=rng();if(!Number.isFinite(v)||v<0||v>=1)throw Error('Invalid random source');const j=Math.floor(v*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function planGrade9MathReference({grade,subject,fullMarks=75,durationMinutes=180,language='both',questions=[],selectedTopicIds=[],previousSignature='',avoidSignatures=[],rng=Math.random,maxVisits=100000,allowOriginalReferenceDraft=false}={}){
 const ref=getGrade9MathReference({grade,subject});
 require(ref&&fullMarks===75&&durationMinutes===180&&['ne','en','both'].includes(language),'Grade 9 75-mark reference required');
 require(Array.isArray(questions)&&questions.length<=5000&&Array.isArray(selectedTopicIds)&&Array.isArray(avoidSignatures)&&avoidSignatures.length<=30&&avoidSignatures.every(x=>typeof x==='string')&&Number.isSafeInteger(maxVisits)&&maxVisits>0&&maxVisits<=200000,'bank or search options');
 const topics=new Set(selectedTopicIds),bank=questions.map(q=>inspect(q,ref,subject,language,topics,allowOriginalReferenceDraft)).filter(Boolean);
 const slots=ref.areas.flatMap(a=>Array.from({length:a.groups},()=>a));
 const shortage=ref.areas.filter(a=>new Set(bank.filter(q=>q.area===a.unitCode).map(q=>q.id)).size<a.groups).map(a=>a.unitCode);
 const no=reason=>({ready:false,reason,shortage,currentCdcExactApproved:false,readyForLive:false});
 if(shortage.length||!topics.size||topics.size>16)return no('Missing distinct reviewed groups or incompatible topics');
 const pools=Object.fromEntries(ref.areas.map(a=>[a.unitCode,shuffle(bank.filter(q=>q.area===a.unitCode),rng)]));
 const remaining=Object.fromEntries(ref.areas.map(a=>[a.unitCode,{items:levels.map(l=>a.itemsByLevel[l]),marks:levels.map(l=>a.marksByLevel[l])}]));
 const chosen=[],used=new Set(),contexts=new Set(),families=new Set(),banned=new Set([previousSignature,...avoidSignatures].filter(Boolean));
 let visits=0;
 const dfs=(step,start)=>{
  if(++visits>maxVisits)throw Error('Math reference search exceeded safe limit');
  if(step===slots.length)return Object.values(remaining).every(x=>x.items.every(n=>n===0)&&x.marks.every(n=>n===0))&&[...topics].every(t=>chosen.some(q=>q.topicId===t))&&!banned.has(sig(chosen));
  const a=slots[step],r=remaining[a.unitCode],pool=pools[a.unitCode],last=slots[step+1]?.unitCode!==a.unitCode;
  for(let i=start;i<pool.length;i++){const x=pool[i];
   if(used.has(x.id)||contexts.has(x.context)||families.has(x.family)||x.items.some((n,j)=>n>r.items[j]||x.marks[j]>r.marks[j]))continue;
   for(let j=0;j<4;j++){r.items[j]-=x.items[j];r.marks[j]-=x.marks[j];}
   used.add(x.id);contexts.add(x.context);families.add(x.family);chosen.push(x.q);
   if((!last||r.items.every(n=>n===0)&&r.marks.every(n=>n===0))&&dfs(step+1,last?0:i+1))return true;
   chosen.pop();used.delete(x.id);contexts.delete(x.context);families.delete(x.family);
   for(let j=0;j<4;j++){r.items[j]+=x.items[j];r.marks[j]+=x.marks[j];}
  }
  return false;
 };
 if(!dfs(0,0))return no('No complete different paper matches every area, item and cognitive mark');
 const paper={gradeNumber:9,subject,fullMarks,durationMinutes,language,topicIds:[...topics],referenceOnly:true,groups:structuredClone(chosen)};
 return {ready:true,paper,signature:sig(chosen),...assertGrade9MathReferencePaper(paper,{allowOriginalReferenceDraft}),readyForLive:false,referenceOnly:true,sourceUrl:ref.sourceUrl};
}
