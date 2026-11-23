// V46 exact CDC-grid slot validator and randomized bank assignment.
// This validates a manually transcribed, grade- and subject-specific CDC grid.
// It DOES NOT assert that a human-supplied grid matches the CDC PDF itself.
const TYPES=new Set(['mcq','short','long']);
const LEVELS=new Set(['knowledge','understanding','application','higher']);
const norm=s=>String(s||'').trim().toLocaleLowerCase().replace(/\s+/g,' ');
function shuffle(items,rng){
 const list=[...items];
 for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]]}
 return list;
}
function integer(n,min,max){return Number.isSafeInteger(n)&&n>=min&&n<=max}
function officialUrl(url){return /^https:\/\/(?:www\.)?moecdc\.gov\.np\//i.test(String(url||''));}
const slotKey=s=>s.type+'::'+s.marks;
export function validateDetailedCdcGrid(blueprint,{fullMarks,gradeNumber,subject}={}){
 if(!blueprint||typeof blueprint!=='object'||Array.isArray(blueprint))
  throw Error('The exact CDC subject grid must be configured by School Admin');
 if(!integer(fullMarks,1,500)||blueprint.fullMarks!==fullMarks)
  throw Error('Selected full marks must equal this subject CDC grid full marks; no silent Custom Pattern substitution');
 if(!integer(gradeNumber,6,10)||Number(blueprint.gradeNumber)!==gradeNumber||
  norm(blueprint.subject)!==norm(subject))
  throw Error('CDC grid belongs to a different class or subject');
 if(!officialUrl(blueprint.sourceUrl)||!String(blueprint.sourceTitle||'').trim()||
  !String(blueprint.curriculumVersion||'').trim()||
  !blueprint.verifiedBy||!blueprint.verifiedAt)
  throw Error('Official source citation and School Admin grid review are required');
 if(!Array.isArray(blueprint.slots)||!blueprint.slots.length||blueprint.slots.length>80)
  throw Error('Detailed CDC grid question slots are missing; a type-count Pattern is not a complete subject Grid');
 const slots=blueprint.slots.map((raw,i)=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
    !Object.keys(raw).every(key=>['type','marks','unitCode','unitTitle','topicId','cognitiveLevel'].includes(key))||
    !TYPES.has(raw.type)||!integer(raw.marks,1,100))
   throw Error('Invalid CDC question slot #'+(i+1));
  for(const label of ['unitCode','unitTitle','topicId'])
   if(raw[label]!==undefined&&(typeof raw[label]!=='string'||!raw[label].trim()||raw[label].length>180))
    throw Error('Invalid CDC '+label+' in slot #'+(i+1));
  if(raw.cognitiveLevel!==undefined&&!LEVELS.has(raw.cognitiveLevel))
   throw Error('Invalid CDC cognitive level in slot #'+(i+1));
  return Object.freeze({...raw});
 });
 if(slots.reduce((sum,s)=>sum+s.marks,0)!==fullMarks)
  throw Error('Detailed CDC question slots do not total the official full marks');
 if(!Array.isArray(blueprint.pattern)||!blueprint.pattern.length)
  throw Error('Subject grid question-type breakdown is missing');
 const pattern=new Map();
 let declared=0;
 for(const row of blueprint.pattern){
  if(!row||!TYPES.has(row.type)||!integer(Number(row.count),0,80)||
   !integer(Number(row.marksEach??row.marks),1,100))
   throw Error('Invalid CDC pattern row');
  const type=row.type,marks=Number(row.marksEach??row.marks),
   count=Number(row.count),key=type+'::'+marks;
  if(pattern.has(key))throw Error('Duplicate CDC pattern question group');
  pattern.set(key,count);declared+=count*marks;
 }
 if(declared!==fullMarks)throw Error('CDC pattern does not total official full marks');
 const counts=new Map();
 for(const slot of slots)counts.set(slotKey(slot),(counts.get(slotKey(slot))||0)+1);
 if([...pattern].some(([key,count])=>counts.get(key)!==count)||
  [...counts].some(([key,count])=>pattern.get(key)!==count))
  throw Error('Detailed CDC slots and grid type/marks breakdown disagree');
 return Object.freeze({fullMarks,gradeNumber,subject,
  sourceUrl:blueprint.sourceUrl,version:blueprint.curriculumVersion,
  slots:Object.freeze(slots)});
}
function fitsSlot(question,slot){
 if(question.questionType!==slot.type||Number(question.marks)!==slot.marks)return false;
 if(slot.unitCode&&norm(question.unitCode)!==norm(slot.unitCode))return false;
 if(slot.unitTitle&&norm(question.unitTitle)!==norm(slot.unitTitle))return false;
 if(slot.topicId&&question.topicId!==slot.topicId)return false;
 if(slot.cognitiveLevel&&question.cognitiveLevel!==slot.cognitiveLevel)return false;
 return true;
}
function chooseAttempt(pools,topics,rng){
 const slotOwners=Array(pools.length).fill(-1);
 const slotChoices=topics.map(topic=>shuffle(pools.map((pool,i)=>
  pool.some(q=>q.topicId===topic)?i:-1).filter(i=>i>=0),rng));
 const order=shuffle(topics.map((_,i)=>i),rng)
  .sort((a,b)=>slotChoices[a].length-slotChoices[b].length);
 if(order.some(i=>slotChoices[i].length===0))return null;
 function claim(topic,visited){
  for(const slot of slotChoices[topic]){
   if(visited.has(slot))continue;
   visited.add(slot);
   if(slotOwners[slot]===-1||claim(slotOwners[slot],visited)){
    slotOwners[slot]=topic;
    return true;
   }
  }
  return false;
 }
 if(!order.every(i=>claim(i,new Set())))return null;
 const matched=Array(pools.length).fill(null),qOwner=new Map(),locked=new Set();
 for(let slot=0;slot<slotOwners.length;slot++){
  const topic=slotOwners[slot];
  if(topic<0)continue;
  const possible=shuffle(pools[slot].filter(q=>q.topicId===topics[topic]),rng);
  const q=possible.find(q=>!qOwner.has(q.id));
  if(!q)return null;
  matched[slot]=q;locked.add(slot);qOwner.set(q.id,slot);
 }
 function assign(slot,visited){
  for(const q of pools[slot]){
   if(visited.has(q.id))continue;
   visited.add(q.id);
   const owner=qOwner.get(q.id);
   if(owner===undefined||(!locked.has(owner)&&assign(owner,visited))){
    qOwner.set(q.id,slot);matched[slot]=q;return true;
   }
  }
  return false;
 }
 const other=shuffle(pools.map((pool,i)=>({i,n:pool.length})).filter(x=>!locked.has(x.i)),rng)
  .sort((a,b)=>a.n-b.n);
 if(!other.every(x=>assign(x.i,new Set())))return null;
 return matched;
}
/**
 * Finds a paper matching EVERY configured question slot and covering each
 * selected topic at least once. If a previous set exists, a new question
 * combination is required; merely shuffling the same questions is not enough.
 * When there are no alternatives, report the shortfall rather than repeat.
 */
export function selectRandomGridQuestions({
 questions,topicIds,grid,previousQuestionIds=[],rng=Math.random
}){
 if(!grid?.slots?.length||!Array.isArray(questions)||!Array.isArray(topicIds)||
  !topicIds.length||new Set(topicIds).size!==topicIds.length||
  !Array.isArray(previousQuestionIds))
  throw Error('A complete validated grid, class topics and question bank are required');
 if(topicIds.length>grid.slots.length)
  throw Error('Selected topics exceed the available question count in the CDC Grid; select fewer topics');
 const available=questions.filter(q=>q&&topicIds.includes(q.topicId)&&
  typeof q.id==='string'&&q.id&&!q.archived&&q.status!=='archived');
 const seen=new Set(),uniques=[];
 for(const q of available){
  const key=norm(q.questionText);
  if(!key||seen.has(key))continue;
  seen.add(key);uniques.push(q);
 }
 if(uniques.length<grid.slots.length)
  throw Error('Not enough distinct reviewed questions for the selected topics and CDC Grid');
 const pools=grid.slots.map((slot,i)=>{
  const pool=shuffle(uniques.filter(q=>fitsSlot(q,slot)),rng);
  if(!pool.length)
   throw Error('CDC Grid slot #'+(i+1)+' has no eligible question: '+slot.type+
    ', '+slot.marks+' marks'+(slot.unitTitle?', '+slot.unitTitle:''));
  return pool;
 });
 const prior=new Set(previousQuestionIds),requireNew=prior.size>0;
 for(let attempt=0;attempt<Math.min(96,Math.max(20,grid.slots.length*2));attempt++){
  const candidate=chooseAttempt(pools,topicIds,rng);
  if(!candidate)continue;
  const ids=candidate.map(q=>q.id);
  if(new Set(ids).size!==ids.length)continue;
  if(topicIds.some(topic=>!candidate.some(q=>q.topicId===topic)))continue;
  if(candidate.reduce((sum,q)=>sum+Number(q.marks),0)!==grid.fullMarks)continue;
  if(requireNew&&ids.every(id=>prior.has(id)))continue;
  return candidate;
 }
 if(requireNew)throw Error('No different CDC-grid-compliant paper is possible with this question bank; add more verified textbook/practice questions');
 throw Error('The selected topics cannot be covered while matching every CDC Grid slot; choose compatible topics or add reviewed questions');
}
