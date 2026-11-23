/**
 * Pure, fail-closed CDC 2082 Optional Mathematics WCA/CCA composite planner.
 * Question bank rows are complete school-reviewed composite items, not AI
 * text. No Firestore write, manual CDC grid input, or invented mark split.
 *
 * The published Grid specifies 11 objective, 12 WCA and 4 CCA questions,
 * the six content-area mark totals, and cognitive mark distribution. It does
 * not specify every subquestion's exact mark in the area summary; the curated
 * bank must provide and the engine must validate each subquestion explicitly.
 */
const GROUPS=['objective','WCA','CCA'];
const LEVELS=['knowledge','understanding','application','higher'];
const NEPALI=/[\u0900-\u097f]/;
const rngFloat=rng=>{const n=rng();if(!Number.isFinite(n)||n<0||n>=1)throw Error('Invalid random source');return n;};
const shuffled=(rows,rng)=>{
 const a=[...rows];
 for(let i=a.length-1;i>0;i--){
  const n=Math.floor(rngFloat(rng)*(i+1));
  [a[i],a[n]]=[a[n],a[i]];
 }return a;
};
const signature=rows=>rows.map(r=>String(r.id)).sort().join('|');
const n=s=>String(s||'').trim();
const sum=(rows,fn)=>rows.reduce((a,x)=>a+fn(x),0);
const mapOf=(keys)=>Object.fromEntries(keys.map(x=>[x,0]));

function validateGuide(guide){
 if(!guide||guide.gridOrigin!=='official_cdc_pdf_2082_optional_math'||
   guide.requiresCompositeQuestionEngine!==true||
   guide.fullMarks!==75||guide.durationMinutes!==180||
   !Array.isArray(guide.areas)||guide.areas.length!==6||
   !Array.isArray(guide.questionGroups)||guide.questionGroups.length!==3||
   !guide.compositeRules)throw Error('Verified CDC Optional Mathematics 2082 grid required');
 const areaCodes=guide.areas.map(x=>String(x.unitCode));
 if(new Set(areaCodes).size!==6||!areaCodes.every(x=>/^[1-9][0-9]*$/.test(x))||
    sum(guide.areas,a=>a.totalMarks)!==75)throw Error('CDC Optional Mathematics content area grid invalid');
 if(JSON.stringify(guide.questionGroups.map(x=>[x.code,x.questionCount,x.totalMarks]))!==
    JSON.stringify([['objective',11,11],['WCA',12,40],['CCA',4,24]])||
    sum(guide.areas,x=>x.objectiveCount)!==11||
    sum(guide.areas,x=>x.wcaQuestionCount)!==12)
  throw Error('CDC Optional Mathematics group totals invalid');
 if(!LEVELS.every(l=>Number.isFinite(guide.cognitiveDistribution?.[l]))||
   sum(LEVELS,l=>guide.cognitiveDistribution[l])!==100||
   guide.compositeRules.minSubquestionsPerQuestion!==2||
   guide.compositeRules.maxSubquestionsPerQuestion!==4)
  throw Error('CDC Optional Mathematics cognitive/composite rules invalid');
 return areaCodes;
}
const present=(item,lang)=>{
 const ne=n(item.textNe),en=n(item.textEn),answerNe=n(item.answerNe),answerEn=n(item.answerEn);
 if(lang==='ne')return !!ne&&!!answerNe&&NEPALI.test(ne);
 if(lang==='en')return !!en&&!!answerEn&&!NEPALI.test(en)&&!NEPALI.test(answerEn);
 return !!ne&&NEPALI.test(ne)&&!!en&&!NEPALI.test(en)&&
  !!answerNe&&!!answerEn&&!NEPALI.test(answerEn);
};
function inspectItem(q,guide,language,areaCodes){
 if(!q||!n(q.id)||!n(q.topicId)||!GROUPS.includes(q.group)||
   q.status==='archived'||q.reviewStatus!=='teacher_reviewed'||!n(q.reviewedBy)||
   q.gradeNumber!==guide.gradeNumber||n(q.subject)!==n(guide.subject)||
   !Array.isArray(q.subquestions))
  return null;
 const type=q.group;
 if(type==='objective'&&q.subquestions.length!==1)return null;
 if(type!=='objective'&&(q.subquestions.length<2||q.subquestions.length>4))return null;
 if(type!=='objective'&&(!present({textNe:q.contextNe,textEn:q.contextEn,
   answerNe:q.contextNe,answerEn:q.contextEn},language)))return null;
 if(!q.subquestions.every(s=>s&&areaCodes.includes(n(s.unitCode))&&
   Number.isSafeInteger(s.marks)&&s.marks>=1&&s.marks<=10&&
   LEVELS.includes(s.cognitiveLevel)&&present(s,language)))return null;
 const touched=[...new Set(q.subquestions.map(s=>n(s.unitCode)))];
 if(type==='CCA'&&touched.length<2)return null;
 if(type!=='CCA'&&touched.length!==1)return null;
 if(type==='objective'&&(q.subquestions[0].marks!==1||
   q.subquestions[0].options?.length&&
   (q.subquestions[0].options.length!==4||
    !['A','B','C','D'].includes(q.subquestions[0].correctOption))))return null;
 const total=sum(q.subquestions,s=>s.marks);
 if(total>12||type==='CCA'&&total<3||type==='WCA'&&total<2)return null;
 const areas=mapOf(areaCodes),cognitive=mapOf(LEVELS);
 for(const sub of q.subquestions){areas[n(sub.unitCode)]+=sub.marks;cognitive[sub.cognitiveLevel]+=sub.marks;}
 return {question:q,group:type,id:n(q.id),topicId:n(q.topicId),areas,cognitive,
  unitCode:type==='CCA'?null:touched[0],marks:total};
}
export function inspectCdcOptionalMathPaper({
 guide,questions,selectedTopicIds,language='ne',previousSignature='',
 avoidSignatures=[],rng=Math.random,maxSearchVisits=120000
}){
 const areaCodes=validateGuide(guide);
 if(!['ne','en','both'].includes(language)||!Array.isArray(questions)||questions.length>5000||
    !Array.isArray(selectedTopicIds)||selectedTopicIds.length<1||
    selectedTopicIds.length>40||selectedTopicIds.some(x=>!n(x))||
    new Set(selectedTopicIds).size!==selectedTopicIds.length||
    !Array.isArray(avoidSignatures)||avoidSignatures.length>30||
    !Number.isSafeInteger(maxSearchVisits)||maxSearchVisits<1||maxSearchVisits>500000)
  throw Error('Invalid composite paper bank, language or selected topics');
 rngFloat(rng);
 const topics=new Set(selectedTopicIds);
 const eligible=[],ids=new Set(),texts=new Set();
 for(const row of questions){
  if(!topics.has(row?.topicId))continue;
  const q=inspectItem(row,guide,language,areaCodes);
  if(!q)continue;
  if(ids.has(q.id))throw Error('Repeated composite question ID in bank');
  ids.add(q.id);
  const contentSignature=(n(row.contextNe)+'|'+row.subquestions.map(s=>n(s.textNe)).join('|')).toLowerCase();
  if(texts.has(contentSignature))continue;
  texts.add(contentSignature);eligible.push(q);
 }
 const areaRows=guide.areas.map(area=>{
  const code=String(area.unitCode);
  return {unitCode:code,totalMarks:area.totalMarks,
   objectiveRequired:area.objectiveCount,wcaRequired:area.wcaQuestionCount,
   objectiveAvailable:eligible.filter(q=>q.group==='objective'&&q.unitCode===code).length,
   wcaAvailable:eligible.filter(q=>q.group==='WCA'&&q.unitCode===code).length};
 });
 const crossAvailable=eligible.filter(q=>q.group==='CCA').length;
 const missing=areaRows.some(x=>x.objectiveAvailable<x.objectiveRequired||
    x.wcaAvailable<x.wcaRequired)||crossAvailable<4;
 const resultBase={gradeNumber:guide.gradeNumber,fullMarks:75,
  sourceUrl:guide.sourceUrl,availableQuestions:eligible.length,
  groupRequired:{objective:11,WCA:12,CCA:4},
  crossAvailable,areaRows};
 if(missing)return {...resultBase,ready:false,
  reason:'Not enough reviewed WCA, CCA and objective questions for the actual CDC area counts',
  questions:[],signature:null};
 const slots=[];
 for(const area of guide.areas){
  for(let i=0;i<area.objectiveCount;i++)slots.push({group:'objective',unitCode:String(area.unitCode)});
  for(let i=0;i<area.wcaQuestionCount;i++)slots.push({group:'WCA',unitCode:String(area.unitCode)});
 }
 for(let i=0;i<4;i++)slots.push({group:'CCA',unitCode:null});
 const candidates=slots.map(slot=>shuffled(eligible.filter(q=>
  q.group===slot.group&&(slot.unitCode===null||q.unitCode===slot.unitCode)),rng));
 const order=slots.map((slot,i)=>({i,slot,pool:candidates[i]}))
  .sort((a,b)=>a.pool.length-b.pool.length);
 const targetAreas=Object.fromEntries(guide.areas.map(x=>[String(x.unitCode),x.totalMarks]));
 const targetCognition=Object.fromEntries(LEVELS.map(l=>[l,guide.cognitiveDistribution[l]*.75]));
 const tolerance=guide.compositeRules.cognitiveMarksTolerance;
 const used=new Set(),seenTopics=new Set(),chosen=new Array(slots.length),
  currentAreas=mapOf(areaCodes),currentCog=mapOf(LEVELS),
  groupMarks=mapOf(GROUPS),groupCounts=mapOf(GROUPS);
 if([previousSignature,...avoidSignatures].some(s=>typeof s!=='string'||s.length>12000))
  throw Error('Invalid previous composite question-paper signature');
 const blocked=new Set([previousSignature,...avoidSignatures].filter(Boolean));
 let visits=0,found=false;
 const search=step=>{
  if(++visits>maxSearchVisits)throw Error('CDC composite search limit reached; improve reviewed question bank');
  if(step===order.length){
   if(groupMarks.objective!==11||groupMarks.WCA!==40||groupMarks.CCA!==24||
      areaCodes.some(code=>currentAreas[code]!==targetAreas[code])||
      LEVELS.some(level=>Math.abs(currentCog[level]-targetCognition[level])>tolerance)||
      [...topics].some(id=>!seenTopics.has(id))||
      blocked.has(signature(chosen.map(x=>x.question))))return false;
   found=true;return true;
  }
  const {i,slot,pool}=order[step];
  for(const q of pool){
   if(used.has(q.id))continue;
   if(groupMarks[slot.group]+q.marks>
     (slot.group==='objective'?11:slot.group==='WCA'?40:24))continue;
   if(areaCodes.some(code=>currentAreas[code]+q.areas[code]>targetAreas[code]))continue;
   if(LEVELS.some(l=>currentCog[l]+q.cognitive[l]>targetCognition[l]+tolerance))continue;
   used.add(q.id);chosen[i]=q;groupMarks[q.group]+=q.marks;groupCounts[q.group]++;
   for(const code of areaCodes)currentAreas[code]+=q.areas[code];
   for(const l of LEVELS)currentCog[l]+=q.cognitive[l];
   seenTopics.add(q.topicId);
   if(search(step+1))return true;
   chosen[i]=null;used.delete(q.id);groupMarks[q.group]-=q.marks;groupCounts[q.group]--;
   for(const code of areaCodes)currentAreas[code]-=q.areas[code];
   for(const l of LEVELS)currentCog[l]-=q.cognitive[l];
   if(!chosen.some(x=>x?.topicId===q.topicId))seenTopics.delete(q.topicId);
  }
  return false;
 };
 search(0);
 if(!found)return {...resultBase,ready:false,
  reason:'Curated questions cannot jointly satisfy CDC 75 marks, area totals, WCA/CCA, cognitive marks and unique paper history',
  questions:[],signature:null};
 const chosenQuestions=chosen.map(x=>x.question);
 return {...resultBase,ready:true,reason:null,questions:chosenQuestions,
  signature:signature(chosenQuestions),groupMarks:{...groupMarks},
  areaMarks:{...currentAreas},cognitiveMarks:{...currentCog},
  teacherReviewRequired:true,sourceApprovedByCdc:false};
}
