/**
 * Exact, fail-closed unit-level CDC grid allocator.
 * This is a transcription checker, NOT a claim that a manually entered grid
 * or any question was independently published/approved by Nepal CDC.
 */
const types=new Set(['mcq','short','long']);
const levels=new Set(['knowledge','understanding','application','higher']);
const official=/^https:\/\/(?:www\.)?(?:moecdc\.gov\.np|lib\.moecdc\.gov\.np)\//i;
const signature=questions=>questions.map(q=>String(q.id)).sort().join('|');
const key=(type,marks)=>type+':'+marks;
function unitOf(q){return String(q.unitCode||'').trim();}
function shuffle(pool,rng){
 const arr=[...pool];for(let i=arr.length-1;i>0;i--){
  const x=Math.floor(rng()*(i+1));[arr[i],arr[x]]=[arr[x],arr[i]];
 }return arr;
}
export function validateExactCdcUnitGrid(blueprint,fullMarks,{strict=true}={}){
 if(!blueprint||Number(blueprint.fullMarks)!==fullMarks)
  throw Error('CDC Grid for this exact class, subject and full marks is not configured');
 if(!Number.isSafeInteger(fullMarks)||fullMarks<=0||fullMarks>500)
  throw Error('Invalid full marks for CDC Grid');
 const entries=blueprint.unitGrid;
 if(!Array.isArray(entries)||!entries.length||entries.length>120)
  throw Error('CDC unit-wise Grid has not been transcribed and checked; official generation is blocked');
 if(strict&&(!official.test(String(blueprint.sourceUrl||''))||
  !String(blueprint.curriculumVersion||'').trim()||
  !String(blueprint.verifiedBy||'').trim()))
  throw Error('CDC source, Grid version and school reviewer must be recorded');
 const counts=new Map(),slots=[],unitCounts=new Map();
 for(const [i,g]of entries.entries()){
  const unitCode=String(g?.unitCode||'').trim(),type=g?.type,
   marks=Number(g?.marks),count=Number(g?.count),level=g?.cognitiveLevel;
  if(!/^[0-9]{1,3}$/.test(unitCode)||!types.has(type)||
   !Number.isSafeInteger(marks)||marks<1||marks>100||
   !Number.isSafeInteger(count)||count<1||count>80||
   !levels.has(level))
   throw Error('Invalid CDC unit/level/type/marks/count in Grid row '+(i+1));
  counts.set(key(type,marks),(counts.get(key(type,marks))||0)+count);
  unitCounts.set(unitCode,(unitCounts.get(unitCode)||0)+count);
  for(let j=0;j<count;j++)slots.push({unitCode,type,marks,cognitiveLevel:level});
  if(slots.length>80)throw Error('CDC Grid contains over 80 questions');
 }
 const total=slots.reduce((sum,x)=>sum+x.marks,0);
 if(total!==fullMarks)
  throw Error('CDC unit-wise marks total '+total+' does not match '+fullMarks);
 if(!Array.isArray(blueprint.pattern)||!blueprint.pattern.length)
  throw Error('CDC Grid aggregate question pattern missing');
 const patternCounts=new Map();
 for(const [i,p]of blueprint.pattern.entries()){
  const type=p?.type,n=Number(p?.count),marks=Number(p?.marksEach??p?.marks);
  if(!types.has(type)||!Number.isSafeInteger(n)||n<0||n>80||
    !Number.isSafeInteger(marks)||marks<1||marks>100)
   throw Error('Invalid CDC aggregate pattern row '+(i+1));
  patternCounts.set(key(type,marks),(patternCounts.get(key(type,marks))||0)+n);
 }
 if(JSON.stringify([...patternCounts].sort())!==JSON.stringify([...counts].sort()))
  throw Error('CDC unit-wise and aggregate Grid question types/marks differ');
 return Object.freeze({
  slots:Object.freeze(slots),rows:entries.length,fullMarks,
  unitCodes:Object.freeze([...unitCounts.keys()].sort()),
  requiredPerUnit:Object.freeze(Object.fromEntries(unitCounts)),
  sourceUrl:String(blueprint.sourceUrl||''),gridVersion:String(blueprint.curriculumVersion||'')
 });
}
/**
 * Randomized exact matching of every unit/level/type/marks slot.
 * Exhaustive within an explicit safe node cap; if selected units omit a
 * required row, or a new paper cannot differ, refuse instead of weakening Grid.
 */
export function allocateExactCdcUnitGrid({
 blueprint,fullMarks,eligible,selectedTopicIds,previousSignature='',rng=Math.random
}){
 const grid=validateExactCdcUnitGrid(blueprint,fullMarks);
 if(!Array.isArray(eligible)||eligible.length>5000||!eligible.length)
  throw Error('No curated questions available for the CDC Grid');
 if(!Array.isArray(selectedTopicIds)||!selectedTopicIds.length)
  throw Error('Select textbook units/topics before generation');
 const selected=new Set(selectedTopicIds);
 const bySlot=grid.slots.map((slot,index)=>{
  const candidates=shuffle(eligible.filter(q=>selected.has(q.topicId)&&
   unitOf(q)===slot.unitCode&&q.questionType===slot.type&&
   Number(q.marks)===slot.marks&&q.cognitiveLevel===slot.cognitiveLevel),rng);
  if(!candidates.length)
   throw Error('CDC Grid requires more reviewed questions: Unit '+slot.unitCode+
    ', '+slot.cognitiveLevel+', '+slot.type+', '+slot.marks+' marks');
  return {index,slot,candidates};
 });
 // Choose the hardest slots first, but randomize ties to vary answer sets.
 const ordered=shuffle(bySlot,rng).sort((a,b)=>a.candidates.length-b.candidates.length);
 const used=new Set(),chosen=new Array(grid.slots.length);
 const requiredTopics=new Set(selected),seenTopic=new Map();
 let visits=0,found=false;
 const track=(id,delta)=>{
  const next=(seenTopic.get(id)||0)+delta;
  if(next===0)seenTopic.delete(id);else seenTopic.set(id,next);
 };
 const search=step=>{
  if(++visits>100000)
   throw Error('CDC Grid search exceeded safe limit; choose fewer topics or improve question bank');
  if(step===ordered.length){
   if([...requiredTopics].some(id=>!seenTopic.has(id)))return false;
   if(previousSignature&&signature(chosen)===previousSignature)return false;
   found=true;return true;
  }
  const {index,candidates}=ordered[step];
  for(const q of candidates){
   const id=String(q.id);
   if(!id||used.has(id))continue;
   used.add(id);chosen[index]=q;track(q.topicId,1);
   if(search(step+1))return true;
   track(q.topicId,-1);chosen[index]=undefined;used.delete(id);
  }
  return false;
 };
 search(0);
 if(!found)throw Error(previousSignature?
  'No different paper is possible with this exact CDC Grid and available questions; add reviewed alternatives':
  'Selected topics cannot satisfy every CDC unit, cognitive and mark requirement. Choose compatible topics or add reviewed questions.');
 const stats=grid.slots.map((slot,i)=>({
  unitCode:slot.unitCode,cognitiveLevel:slot.cognitiveLevel,
  questionType:slot.type,marks:slot.marks,
  questionId:String(chosen[i].id),topicId:String(chosen[i].topicId)
 }));
 return Object.freeze({questions:Object.freeze(chosen),signature:signature(chosen),
  gridSummary:grid,slotEvidence:Object.freeze(stats),officialGridMismatch:false});
}
