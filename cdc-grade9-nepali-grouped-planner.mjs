/**
 * Grade 9 Nepali reference-only grouped paper planner.
 * Works from individually reviewed candidate tasks; never invents a passage,
 * textbook attribution, answer or missing choice. The 2078 feedback reference
 * is not yet a current approved 2083 grid. No save/print/deployment authority.
 */
import {cdcSubjectKey} from './cdc-grid-source-index.mjs';
import {getNepali2078Reference,checkNepali2078GroupedDraft} from './cdc-grade9-nepali-model-2078.mjs';
const str=v=>String(v??'').trim();
const normal=v=>str(v).normalize('NFC').replace(/\s+/g,' ');
const words=v=>normal(v).split(' ').filter(Boolean).length;
const seenSkills=new Set(['vocabulary_matching','vocabulary_sentence_use','spelling_choice','notes_and_summary','textbook_comprehension','reasoned_response','interpretation','critical_response']);
const genreSets={
 guided_writing:[['story','biography'],['speech','dialogue']],
 functional_writing:[['official_letter','application'],['invitation','comment','congratulations','greeting','tribute','sympathy','notice']],
 textbook_comprehension:[['story','poem'],['speech','essay','travelogue'],['biography','dialogue']],
 essay:[['personal'],['objective'],['objective']]
};
const sourceOK=q=>q.sourceKind==='textbook'&&str(q.sourceTitle)&&str(q.sourceEdition)&&
 /^https:\/\/(?:[a-z0-9-]+\.)*(?:moecdc\.gov\.np|giwmscdnone\.gov\.np|giwmscdntwo\.gov\.np)\//i.test(str(q.sourceUrl))&&
 Number.isSafeInteger(q.sourcePage)&&q.sourcePage>0;
function matches(q,s,subject,topics){
 if(!q||q.gradeNumber!==9||str(q.subject)!==str(subject)||q.status==='archived'||
  !str(q.id)||!topics.has(q.topicId)||q.reviewStatus!=='teacher_reviewed'||!str(q.reviewedBy)||
  q.skill!==s.skill||q.cognitiveLevel!==s.cognitiveLevel||q.marks!==s.marksPerChoice||
  !str(q.text)||!str(q.answer)||!/\p{Script=Devanagari}/u.test(q.text))return false;
 if(seenSkills.has(s.skill)&&!sourceOK(q))return false;
 if(['grammar_passage','unseen_passage','notes_and_summary'].includes(s.skill)){
  if(!str(q.passage)||words(q.passage)>(s.skill==='unseen_passage'?150:125))return false;
  if(s.skill==='unseen_passage'&&q.sourceKind!=='original_unseen')return false;
 }
 if(s.componentMarks&&(!Array.isArray(q.components)||q.components.length!==s.componentMarks.length||
  q.components.some((p,i)=>!str(p?.text)||!str(p?.answer)||p.marks!==s.componentMarks[i])))return false;
 return true;
}
const shuffle=(a,rng)=>{
 const b=[...a];for(let i=b.length-1;i>0;i--){const n=rng();if(!Number.isFinite(n)||n<0||n>=1)throw Error('Invalid random source');const j=Math.floor(n*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;
};
const paperSignature=groups=>groups.flatMap(g=>g.choices.map(c=>str(c.id))).sort().join('|');
export function planNepali2078ReferencePaper({grade,subject,fullMarks=75,durationMinutes=180,questions=[],selectedTopicIds=[],previousSignature='',avoidSignatures=[],rng=Math.random,maxVisits=100000}={}){
 if(grade!==9||cdcSubjectKey(subject)!=='nepali'||fullMarks!==75||durationMinutes!==180)throw Error('Grade 9 Nepali 75-mark 180-minute reference required');
 if(!Array.isArray(questions)||questions.length>5000||!Array.isArray(selectedTopicIds)||!Array.isArray(avoidSignatures)||avoidSignatures.length>30||
  avoidSignatures.some(x=>typeof x!=='string')||!Number.isSafeInteger(maxVisits)||maxVisits<1||maxVisits>200000)throw Error('Invalid reference bank or saved-paper exclusions');
 const ref=getNepali2078Reference(),topics=new Set(selectedTopicIds.filter(x=>typeof x==='string'&&x.trim()));
 const cells=[],groups=ref.slots.map(s=>({number:s.number,skill:s.skill,cognitiveLevel:s.cognitiveLevel,answerCount:s.answerCount,marks:s.marks,choices:new Array(s.offered)}));
 for(const [i,s]of ref.slots.entries()){
  const candidates=questions.filter(q=>matches(q,s,subject,topics));
  for(let j=0;j<s.offered;j++){
   const genres=genreSets[s.skill]?.[j];
   const pool=candidates.filter(q=>!genres||genres.includes(q.genre));
   cells.push({i,j,s,pool});
  }
 }
 const shortages=cells.filter(c=>!c.pool.length).map(c=>({group:c.s.number,skill:c.s.skill,choice:c.j+1,allowedGenres:genreSets[c.s.skill]?.[c.j]||[],reason:'No eligible reviewed task'}));
 const missing=(reason)=>({ready:false,reason,shortages,requiredGroups:20,requiredChoices:cells.length,currentCdcExactApproved:false,readyForLive:false});
 if(shortages.length||!topics.size)return missing('Required reviewed tasks are missing; no partial paper generated');
 if(topics.size>cells.length)return missing('Selected topics exceed the available reference choice positions');
 const ordered=shuffle(cells,rng).sort((a,b)=>a.pool.length-b.pool.length);
 const banned=new Set([previousSignature,...avoidSignatures].filter(Boolean));
 const ids=new Set(),texts=new Set(),topicCounts=new Map();
 let visits=0;
 const solve=step=>{
  if(++visits>maxVisits)throw Error('Nepali reference search exceeded its safe limit');
  if(step===ordered.length)return [...topics].every(t=>topicCounts.has(t))&&!banned.has(paperSignature(groups));
  const {i,j,pool}=ordered[step];
  for(const q of shuffle(pool,rng)){
   const id=str(q.id),text=normal(q.text);
   if(ids.has(id)||texts.has(text))continue;
   ids.add(id);texts.add(text);topicCounts.set(q.topicId,(topicCounts.get(q.topicId)||0)+1);
   groups[i].choices[j]={id,text:q.text,answer:q.answer,marks:q.marks,topicId:q.topicId,genre:q.genre||null,
    ...(q.passage?{passage:q.passage}:{}),
    ...(q.components?{components:q.components.map(p=>({text:p.text,answer:p.answer,marks:p.marks}))}:{}),
    ...(q.sourceKind==='textbook'?{sourceKind:q.sourceKind,sourceTitle:q.sourceTitle,sourceEdition:q.sourceEdition,sourceUrl:q.sourceUrl,sourcePage:q.sourcePage}:{})};
   if(solve(step+1))return true;
   groups[i].choices[j]=undefined;ids.delete(id);texts.delete(text);
   const n=topicCounts.get(q.topicId)-1;if(n)topicCounts.set(q.topicId,n);else topicCounts.delete(q.topicId);
  }
  return false;
 };
 if(!solve(0))return missing('No distinct complete reference paper satisfies every topic and saved-set exclusion');
 const paper={gradeNumber:9,subject,fullMarks,durationMinutes,language:'ne',groups};
 const checked=checkNepali2078GroupedDraft(paper);
 return {ready:true,paper,signature:paperSignature(groups),...checked,readyForLive:false,sourceUrl:ref.sourceUrl,referenceOnly:true};
}
