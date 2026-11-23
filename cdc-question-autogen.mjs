// Pure, dependency-free paper planner for V46. Original locally bundled
// questions are NOT CDC-published model questions. No external AI or billing.
// Never silently translate a question or invent a missing answer key.
const TYPES=['mcq','short','long'];
const LEVELS=['knowledge','understanding','application','higher'];
const NEPALI=/[\u0900-\u097f]/;
// Do not mistake Computer Science for Science and Technology.
export const isSupportedScienceSubject=s=>/^(?:विज्ञान(?: तथा प्रविधि)?|अनिवार्य विज्ञान(?: तथा प्रविधि)?|science|science and technology|science & technology|general science)$/i.test(String(s||'').trim().replace(/\s+/g,' '));
const scienceSubject=isSupportedScienceSubject;
const normalize=s=>String(s??'').trim().toLocaleLowerCase().replace(/\s+/g,' ');
function shuffled(items,rng){
 const a=[...items];for(let i=a.length-1;i>0;i--){const k=Math.floor(rng()*(i+1));[a[i],a[k]]=[a[k],a[i]]}return a;
}
function ensureRandom(rng){
 if(typeof rng!=='function')throw Error('Random source required');
 const v=rng();if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>=1)throw Error('Invalid random source');
}
export function readBundledScienceBank(pack,{grade,subject,bilingual={}}){
 if(![8,10].includes(grade)||!scienceSubject(subject))throw Error('No curated built-in source for this class and subject');
 if(pack?.schemaVersion!==1||pack.gradeNumber!==grade||
  !/teacher_review_required/.test(String(pack.status||''))||
  !/^https:\/\/(?:www\.)?moecdc\.gov\.np\//.test(pack.sourceUrl||'')||
  !Array.isArray(pack.units)||!pack.units.length||
  !Array.isArray(pack.questions)||!pack.questions.length)
  throw Error('Bundled original practice questions have unverified source metadata');
 const units=new Map(),rows=[];
 for(const item of pack.units){
  const code=String(item?.unitCode||''),name=String(item?.unitTitle||'').trim();
  if(!/^[0-9]{1,3}$/.test(code)||!name||units.has(code)||
   !Array.isArray(item.topics)||!item.topics.length||item.topics.some(t=>!String(t).trim()))
   throw Error('Invalid or duplicate textbook unit');
  units.set(code,{id:'builtIn_g'+grade+'_u'+code,unitCode:code,unitTitle:name,
   topics:[...item.topics],localPractice:true,sourceUrl:pack.sourceUrl,
   curriculumVersion:pack.curriculumVersion});
 }
 const seen=new Set(),firstMcqUnits=new Set();
 for(let i=0;i<pack.questions.length;i++){
  const q=pack.questions[i],unit=units.get(String(q?.unitCode||'')),
   text=String(q?.questionText||'').trim(),marks=Number(q?.marks);
  if(!unit||!unit.topics.some(topic=>normalize(topic)===normalize(q.topicName))||
   !TYPES.includes(q.questionType)||!LEVELS.includes(q.cognitiveLevel)||
   !Number.isSafeInteger(marks)||marks<1||marks>100||
   !text||text.length>3000||!String(q.answer||'').trim()||
   (q.questionType==='mcq'&&(!Array.isArray(q.options)||q.options.length!==4||
     q.options.some(o=>!String(o).trim())||!['A','B','C','D'].includes(q.correctOption))))
   throw Error('Invalid original practice question at row '+(i+1));
  if(seen.has(normalize(text)))throw Error('Repeated bundled question: '+text);
  seen.add(normalize(text));
  const translationKey=grade+':'+q.unitCode;
  // Bilingual record is reviewed per unit FIRST MCQ only, never inferred
  // from an unrelated question with the same topic or from a machine guess.
  const translation=q.questionType==='mcq'&&!firstMcqUnits.has(String(q.unitCode))?
   bilingual[translationKey]:null;
  if(q.questionType==='mcq')firstMcqUnits.add(String(q.unitCode));
  if(translation&&(!String(translation.questionTextEn||'').trim()||
    !Array.isArray(translation.optionsEn)||translation.optionsEn.length!==4||
    translation.optionsEn.some(o=>!String(o||'').trim())||
    !String(translation.answerEn||'').trim()))
   throw Error('Invalid bilingual material for '+translationKey);
  // Prevent a translated question/answer from silently attaching to a changed
  // or reordered Nepali MCQ after a textbook/source revision.
  if(translation&&(translation.originalQuestionNe!==text||
     !Array.isArray(translation.originalOptionsNe)||
     JSON.stringify(translation.originalOptionsNe)!==JSON.stringify(q.options)||
     translation.originalCorrectOption!==q.correctOption))
   throw Error('Bilingual source question no longer matches Nepali original at '+translationKey);
  rows.push({
   id:'builtIn_'+grade+'_'+i,gradeNumber:grade,
   unitId:unit.id,unitTitle:unit.unitTitle,
   topicId:unit.id+'_0',topicName:String(q.topicName),
   questionType:q.questionType,marks,cognitiveLevel:q.cognitiveLevel,
   questionText:text,options:q.options||[],correctOption:q.correctOption||'',
   answer:q.answer,questionTextEn:translation?.questionTextEn||'',
   optionsEn:translation?.optionsEn||[],answerEn:translation?.answerEn||'',
   status:'active',bundled:true
  });
 }
 return {units:[...units.values()],questions:rows,sourceUrl:pack.sourceUrl,
  sourceStatus:'original_practice_teacher_review_required',reviewRequired:true};
}
export function supportsQuestionLanguage(q,language){
 const nepali=String(q.questionText||'').trim(),english=String(q.questionTextEn||'').trim();
 if(language==='ne')return !!nepali&&NEPALI.test(nepali);
 if(language==='en')return !!english||!!nepali&&!NEPALI.test(nepali);
 if(language==='both')return !!english&&!!nepali&&NEPALI.test(nepali);
 return false;
}
function validatedQuestion(q,language){
 if(!q||!TYPES.includes(q.questionType)||!LEVELS.includes(q.cognitiveLevel)||
  !Number.isSafeInteger(Number(q.marks))||Number(q.marks)<1||Number(q.marks)>100||
  !String(q.topicId||'').trim()||!String(q.questionText||'').trim()||
  !supportsQuestionLanguage(q,language))return false;
 const text=language==='en'?(q.questionTextEn||q.questionText):q.questionText;
 const options=language==='en'?(q.optionsEn?.length===4?q.optionsEn:q.options):q.options;
 if(!String(text).trim()||!String(q.answer||q.answerEn||'').trim())return false;
 if(q.questionType==='mcq'&&(!Array.isArray(options)||options.length!==4||
  options.some(x=>!String(x||'').trim())||!['A','B','C','D'].includes(q.correctOption)))return false;
 if(language==='both'&&q.questionType==='mcq'&&(!Array.isArray(q.optionsEn)||
  q.optionsEn.length!==4||q.optionsEn.some(x=>!String(x||'').trim())))return false;
 return true;
}
function inLanguage(q,language,rng){
 const original=String(q.questionText).trim(),en=String(q.questionTextEn||'').trim();
 const questionText=language==='ne'?original:
  language==='en'?(en||original):original+'\n'+en;
 const options=language==='both'?
  q.options.map((option,i)=>String(option)+' / '+String(q.optionsEn[i])):
  language==='en'&&q.optionsEn?.length===4?q.optionsEn:q.options||[];
 const answer=language==='both'?
  String(q.answer||'')+'\n'+String(q.answerEn||''):
  language==='en'?String(q.answerEn||q.answer||''):String(q.answer||'');
 const normalized={...q,questionText,answer,options:[...options],language};
 if(q.questionType==='mcq'){
  const correct=q.correctOption.charCodeAt(0)-65;
  const slots=shuffled([0,1,2,3],rng);
  normalized.options=slots.map(i=>options[i]);
  normalized.correctOption=String.fromCharCode(65+slots.indexOf(correct));
 }
 return normalized;
}
function exactBlueprint(blueprint,fullMarks){
 if(!blueprint||Number(blueprint.fullMarks)!==fullMarks)return null;
 const pattern=blueprint.pattern;
 if(!Array.isArray(pattern)||!pattern.length||pattern.length>12)
  throw Error('Invalid configured CDC reference grid');
 const seen=new Set();let total=0;
 for(const p of pattern){
  const count=Number(p.count),marks=Number(p.marksEach??p.marks);
  if(!TYPES.includes(p.type)||seen.has(p.type)||!Number.isSafeInteger(count)||
    count<0||count>80||!Number.isSafeInteger(marks)||marks<1||marks>100)
   throw Error('Invalid configured CDC reference grid');
  seen.add(p.type);total+=count*marks;
 }
 if(total!==fullMarks)throw Error('The configured grid does not add up to full marks');
 return pattern.map(p=>({type:p.type,count:Number(p.count),marks:Number(p.marksEach??p.marks)}));
}
function fillSubset(pool,target,maxCount,rng){
 if(target===0)return [];
 const states=new Map([[0,[]]]);
 for(const q of shuffled(pool,rng)){
  const snapshot=[...states.entries()];
  for(const [sum,items]of snapshot){
   const next=sum+Number(q.marks);
   if(next>target||items.length>=maxCount||states.has(next))continue;
   states.set(next,[...items,q]);
  }
  if(states.has(target))return states.get(target);
 }
 return null;
}
export function buildAutomaticQuestionPaper({
 questions,topicIds,fullMarks,language='ne',blueprint=null,rng=Math.random
}){
 ensureRandom(rng);
 if(!['ne','en','both'].includes(language))throw Error('Choose Nepali, English or Both');
 if(!Number.isSafeInteger(fullMarks)||fullMarks<1||fullMarks>500)
  throw Error('Full marks must be a whole number from 1 to 500');
 if(!Array.isArray(topicIds)||!topicIds.length||topicIds.length>40||
  topicIds.some(s=>typeof s!=='string'||!s.trim())||new Set(topicIds).size!==topicIds.length)
  throw Error('Select 1–40 distinct topics');
 if(!Array.isArray(questions)||questions.length>5000)
  throw Error('Question bank is unavailable or too large');
 const chosenIds=new Set(topicIds),eligible=[],known=new Set();
 for(const q of questions){
  if(!q||!chosenIds.has(q.topicId)||q.status==='archived'||!validatedQuestion(q,language))continue;
  const key=normalize(q.questionText);
  if(known.has(key))continue;
  known.add(key);eligible.push(q);
 }
 if(!eligible.length)throw Error('No reviewed questions in the selected language and topics');
 for(const topic of topicIds)if(!eligible.some(q=>q.topicId===topic))
  throw Error('Selected topic lacks valid '+language+' questions: '+topic);
 const pattern=exactBlueprint(blueprint,fullMarks);
 let selected=null;
 if(pattern){
  const used=new Set(),result=[],covered=new Set();
  for(const p of pattern){
   const pool=shuffled(eligible.filter(q=>q.questionType===p.type&&Number(q.marks)===p.marks),rng);
   if(pool.length<p.count)throw Error('CDC reference grid needs '+p.count+' '+p.marks+'-mark '+p.type+' questions; only '+pool.length+' are available');
   for(let i=0;i<p.count;i++){
    const options=pool.filter(q=>!used.has(q));
    options.sort((a,b)=>Number(covered.has(a.topicId))-Number(covered.has(b.topicId)));
    const q=options[0];if(!q)throw Error('Reference grid needs more distinct questions');
    result.push(q);used.add(q);covered.add(q.topicId);
   }
  }
  if(topicIds.some(id=>!covered.has(id)))
   throw Error('Selected topics cannot all fit the configured CDC reference grid');
  selected=result;
 }else{
  // Reserve at least one independently valid question per selected topic.
  // Vary the reserved marks to avoid false negatives for odd/even totals.
  for(let attempt=0;attempt<100&&!selected;attempt++){
   const reserved=[],reservedIds=new Set();let sum=0;
   for(const topic of shuffled(topicIds,rng)){
    const pool=shuffled(eligible.filter(q=>q.topicId===topic),rng)
     .sort((a,b)=>Number(a.marks)-Number(b.marks));
    const index=attempt===0?0:Math.min(Math.floor(rng()*Math.min(3,pool.length)),pool.length-1);
    const pick=pool[index];
    reserved.push(pick);reservedIds.add(pick);sum+=Number(pick.marks);
   }
   if(sum>fullMarks||reserved.length>80)continue;
   const more=fillSubset(eligible.filter(q=>!reservedIds.has(q)),
    fullMarks-sum,80-reserved.length,rng);
   if(more)selected=[...reserved,...more];
  }
  if(!selected)throw Error('Cannot make exactly '+fullMarks+' marks from these topics and available questions. Choose more topics, a different full mark, or add verified questions.');
 }
 if(!selected.length||selected.length>80||
  new Set(selected.map(q=>normalize(q.questionText))).size!==selected.length||
  selected.reduce((sum,q)=>sum+Number(q.marks),0)!==fullMarks)
  throw Error('Question paper quality verification failed');
 const order={mcq:0,short:1,long:2};
 const sorted=selected.map(q=>inLanguage(q,language,rng))
  .sort((a,b)=>order[a.questionType]-order[b.questionType]);
 return {questions:sorted,fullMarks,language,
  blueprintMatched:!!pattern,allTopicsCovered:true,teacherReviewRequired:true,
  sourceStatus:pattern?'admin_entered_cdc_grid_reference_not_independently_verified':
   'original_practice_custom_full_marks_not_cdc_grid',
  questionCount:sorted.length,topicCount:topicIds.length};
}
