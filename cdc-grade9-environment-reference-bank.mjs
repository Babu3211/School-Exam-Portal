/** Original environment exercises in the 2083 school model's aggregate
 * 11x1, 8x5, 3x8 pattern. The nine CDC textbook units do NOT establish an
 * official external-exam unit allocation. Review preview only, never an exam.
 */
import {grade9EnvironmentOriginalBank} from './cdc-grade9-environment-original-practice.mjs';
import {cdcSubjectKey} from './cdc-grid-source-index.mjs';
const extra=[
 ['वातावरणका जैविक घटक भनेका के हुन्?','What are biotic components of the environment?','वातावरणका जीवित घटकहरू।','The living components of the environment.'],
 ['खाद्य शृङ्खलामा अपघटकको एउटा उदाहरण दिनुहोस्।','Give one example of a decomposer in a food chain.','ढुसी।','A fungus.'],
 ['अनवीकरणीय प्राकृतिक स्रोतको एउटा उदाहरण दिनुहोस्।','Give one example of a nonrenewable natural resource.','कोइला।','Coal.'],
 ['जल प्रदूषणको एउटा स्रोत लेख्नुहोस्।','Name one source of water pollution.','अप्रशोधित ढल।','Untreated sewage.'],
 ['जलवायु परिवर्तन अनुकूलनको एउटा उपाय लेख्नुहोस्।','State one climate adaptation measure.','खडेरी सहने बाली लगाउने।','Plant drought-tolerant crops.'],
 ['दिगो उपभोगको एउटा अभ्यास लेख्नुहोस्।','State one sustainable consumption practice.','सामग्री पुनः प्रयोग गर्नु।','Reuse materials.'],
 ['सुरक्षित खानेपानीको एउटा उपाय लेख्नुहोस्।','State one way to make drinking water safer.','उमालेर चिसो बनाउने।','Boil it and allow it to cool.'],
 ['विपद् पूर्वतयारीको एउटा उदाहरण दिनुहोस्।','Give an example of disaster preparedness.','नियमित निकास अभ्यास।','Regular evacuation drills.'],
 ['वातावरणीय अनुगमनमा प्रयोग गर्न सकिने एउटा सूचक लेख्नुहोस्।','Name one indicator useful in environmental monitoring.','पानीको खपत।','Water consumption.']
];
export function grade9EnvironmentReferenceBank({grade,subject}={}){
 const pack=grade9EnvironmentOriginalBank({grade,subject});
 if(grade!==9||cdcSubjectKey(subject)!=='optional_environment'||pack.units.length!==9)return {units:[],questions:[]};
 const added=extra.map(([questionText,questionTextEn,answer,answerEn],i)=>{const u=pack.units[i];return {id:'smss_env_ref9_extra1_'+i,gradeNumber:9,subject,unitCode:u.unitCode,unitId:u.id,unitTitle:u.unitTitle,topicId:u.id+'_0',topicName:u.unitTitle,questionType:'very_short',marks:1,cognitiveLevel:'knowledge',questionText,questionTextEn,answer,answerEn,status:'active',bundled:true,teacherReviewRequired:true,reviewStatus:'draft',officialCdcQuestion:false,sourceStatus:'SMSS_original_reference_draft'};});
 // Copy only the already authored 1/5/8-mark exercises into the distinct
 // reference bank. Preserve the original IDs and avoid duplicate storage.
 const questions=pack.questions.filter(q=>[1,5,8].includes(q.marks)).map(q=>({...q,reviewStatus:'draft',sourceStatus:'SMSS_original_reference_draft'}));
 // Original alternate 8-mark pollution task, not a quoted CDC question.
 const u=pack.units[3];
 const alternative={id:'smss_env_ref9_pollution_alt8',gradeNumber:9,subject,unitCode:u.unitCode,unitId:u.id,unitTitle:u.unitTitle,topicId:u.id+'_0',topicName:u.unitTitle,questionType:'long',marks:8,cognitiveLevel:'higher',questionText:'बजार क्षेत्रको ध्वनि र ठोस फोहोर प्रदूषणका चार कारण तथा तिनका चार नियन्त्रण उपाय विश्लेषण गर्नुहोस्।',questionTextEn:'Analyze four causes of noise and solid waste pollution in a market area and four corresponding control measures.',answer:'अनावश्यक हर्न, चर्को ध्वनिविस्तारक, खुला फोहोर फाल्ने अभ्यास र अपर्याप्त सङ्कलन; हर्न नियन्त्रण, ध्वनि सीमा पालना, वर्गीकरण र नियमित सङ्कलन।',answerEn:'Unnecessary horns, loudspeakers, open dumping and inadequate collection; restrict horns, enforce noise limits, segregate waste and collect it regularly.',markParts:[4,4],status:'active',bundled:true,teacherReviewRequired:true,reviewStatus:'draft',officialCdcQuestion:false,sourceStatus:'SMSS_original_reference_draft'};
 return {units:pack.units,questions:[...questions,...added,alternative],added:[...added,alternative]};
}
const pattern=[['very_short',1,11],['short',5,8],['long',8,3]];
const shuffle=(a,rng)=>{const b=[...a];for(let i=b.length-1;i>0;i--){const v=rng();if(!(v>=0&&v<1))throw Error('Invalid random source');const j=Math.floor(v*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
const normalized=x=>String(x||'').normalize('NFC').trim().replace(/\s+/g,' ');
export function planEnvironmentSchoolReference({grade,subject,fullMarks,durationMinutes,language,questions=[],selectedTopicIds=[],previousSignature='',avoidSignatures=[],rng=Math.random}={}){
 if(grade!==9||cdcSubjectKey(subject)!=='optional_environment'||fullMarks!==75||durationMinutes!==135||!['ne','en','both'].includes(language))throw Error('Environment school reference requires Grade 9, 75 marks, 135 minutes');
 if(!Array.isArray(avoidSignatures)||avoidSignatures.length>30||avoidSignatures.some(x=>typeof x!=='string'||x.length>20000))throw Error('Invalid reference paper history');
 const banned=new Set([previousSignature,...avoidSignatures].filter(Boolean));
 const pollUnit='4';
 const topics=new Set(selectedTopicIds);
 const bank=questions.filter(q=>q?.gradeNumber===9&&q.subject===subject&&topics.has(q.topicId)&&q.bundled===true&&q.reviewStatus==='draft'&&q.teacherReviewRequired===true&&q.officialCdcQuestion===false&&q.sourceStatus==='SMSS_original_reference_draft'&&q.status!=='archived'&&q.id&&normalized(q.questionText)&&normalized(q.questionTextEn)&&normalized(q.answer)&&normalized(q.answerEn));
 const pools=pattern.map(([type,marks,count])=>({type,marks,count,bank:bank.filter(q=>q.questionType===type&&q.marks===marks)}));
 const shortages=pools.filter(p=>p.bank.length<p.count).map(p=>p.type+' '+p.bank.length+'/'+p.count);
 const fail=reason=>({ready:false,reason,shortages,currentCdcExactApproved:false,readyForLive:false});
 if(!topics.size||shortages.length)return fail('Insufficient selected questions for the school model pattern');
 const pollutionPool=bank.filter(q=>String(q.unitCode)===pollUnit&&q.questionType==='long'&&q.marks===8);
 if(!pollutionPool.length)return fail('The school reference requires a selected environmental pollution topic for its 8-mark OR alternative');
 // 11 one-mark slots can cover all nine unit topics. Prefer still-uncovered
 // topics while choosing other types too. Randomize separately each attempt.
 for(let attempt=0;attempt<160;attempt++){
  const chosen=[],used=new Set(),texts=new Set(),covered=new Set();
  for(const p of pools){
   const shuffled=shuffle(p.bank,rng),offset=attempt%Math.max(1,shuffled.length);
   const pool=[...shuffled.slice(offset),...shuffled.slice(0,offset)];
   for(let i=0;i<p.count;i++){
    const candidates=pool.filter(q=>!used.has(q.id)&&!texts.has(normalized(q.questionTextEn)));
    const q=candidates.find(q=>!covered.has(q.topicId))||candidates[0];if(!q)break;
    chosen.push(q);used.add(q.id);texts.add(normalized(q.questionTextEn));covered.add(q.topicId);
   }
  }
  const alternatives=shuffle(pollutionPool,rng).filter(q=>!used.has(q.id)&&!texts.has(normalized(q.questionTextEn)));
  const alternative=alternatives[0];if(!alternative)continue;
  // Count the long alternative exactly once as a choice, never as extra marks.
  const target=chosen.findIndex(q=>q.questionType==='long'&&String(q.unitCode)===pollUnit);
  const index=target>=0?target:chosen.length-1;
  if(chosen[index]?.questionType!=='long')continue;
  const signature=[...chosen.map(q=>q.id),alternative.id].sort().join('|');
  if(chosen.length!==22||chosen.reduce((n,q)=>n+q.marks,0)!==75||[...topics].some(t=>!covered.has(t))||banned.has(signature))continue;
  if(pattern.some(([type,marks,count])=>chosen.filter(q=>q.questionType===type&&q.marks===marks).length!==count))continue;
  const grouped=chosen.map((q,i)=>i===index?{...q,orAlternative:alternative}:q);
  return {ready:true,paper:{gradeNumber:9,subject,fullMarks,durationMinutes,language,questions:grouped,referenceOnly:true},signature,currentCdcExactApproved:false,readyForLive:false,referenceOnly:true,sourceUrl:'https://anyflip.com/jwxmu/hsyg/basic/101-150',referenceLabel:'School model aggregate pattern and pollution OR choice only; current nine-unit textbook differs from the ten-unit school reference. No verified CDC unit or cognitive distribution.'};
 }
 return fail('Cannot form a distinct complete 75-mark review draft from selected topics');
}
