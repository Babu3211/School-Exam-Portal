/** Historical Grade 9 Social Studies reference, CDC 2078 feedback copy.
 * School mirror printed pages 1, 2 and 4 visually checked; 2082 curriculum
 * changes the content-area order and limits Grade 9 map work to Nepal.
 * This is a reference-only planner, not an approved 2083 exam generator.
 */
import {auditGrade9ModelReference} from './cdc-grade9-model-reference-audit.mjs';
import {cdcSubjectKey} from './cdc-grid-source-index.mjs';
const str=x=>String(x??'').trim();
const norm=x=>str(x).normalize('NFC').replace(/\s+/g,' ');
const cat=x=>['knowledge','understanding'].includes(x)?0:x==='application'?1:x==='higher'?2:-1;
const types=['very_short','short','long'];
const require=(ok,msg)=>{if(!ok)throw Error('Social reference mismatch: '+msg);};
const names=['Our Society','Development Foundations','Social Values','Social Reform','Civic Awareness','Our Earth','Economic Activities','Our Past','International Relations','Population Management'];
const langOK=(ne,en,lang)=>lang==='ne'?!!str(ne):lang==='en'?!!str(en):!!str(ne)&&!!str(en);
function validMap(q,lang){
 if(!Array.isArray(q.mapChoices)||q.mapChoices.length!==2)return false;
 const [nepal,continent]=q.mapChoices;
 if(nepal.region!=='Nepal'||!['Africa','Asia','Europe','North America','South America','Australia','Antarctica'].includes(continent.region))return false;
 return q.mapChoices.every(c=>c.outlineMarks===2&&c.labelMarks===5&&langOK(c.textNe,c.textEn,lang)&&langOK(c.answerNe,c.answerEn,lang)&&Array.isArray(c.labels)&&c.labels.length===5&&new Set(c.labels.map(l=>norm(l.en))).size===5&&c.labels.every(l=>langOK(l.ne,l.en,lang)));
}
export function getSocial2078Reference({grade,subject}={}){
 if(grade!==9||cdcSubjectKey(subject)!=='social')return null;
 const audit=auditGrade9ModelReference({grade,subject});
 const slots=audit.slots.flatMap(s=>Array.from({length:s.required},()=>({historicUnit:s.historicUnit,currentUnit:s.currentUnit,unitTitle:names[s.currentUnit-1],type:s.type,marks:s.marks,category:s.category,mapAlternative:s.historicUnit===6&&s.type==='long',creativeTask:s.historicUnit===8&&s.type==='long'}))).sort((a,b)=>types.indexOf(a.type)-types.indexOf(b.type)||a.historicUnit-b.historicUnit||a.category-b.category);
 require(slots.length===24&&slots.reduce((n,s)=>n+s.marks,0)===75,'reference arithmetic');
 return {grade,subject,fullMarks:75,durationMinutes:180,slots,unitMarks:audit.unitMarks,cognitiveMarks:audit.cognitiveMarks,sourceUrl:audit.url,curriculumUrl:'https://giwmscdnone.gov.np/media/pdf_upload/social%209-10_oe5hq7v.pdf',currentCdcExactApproved:false,oldMapAlternativeNotCurrentCurriculumVerified:true};
}
function eligible(q,s,subject,lang,topics,allowDraft=false){
 const reviewed=q?.reviewStatus==='teacher_reviewed'&&str(q.reviewedBy);
 const draft=allowDraft&&q?.bundled===true&&q?.reviewStatus==='draft'&&q?.teacherReviewRequired===true&&q?.sourceStatus==='SMSS_original_reference_draft'&&q?.officialCdcQuestion===false;
 if(!q||q.gradeNumber!==9||q.subject!==subject||q.status==='archived'||(!reviewed&&!draft)||!str(q.id)||!topics.has(q.topicId)||String(q.unitCode)!==String(s.currentUnit)||q.questionType!==s.type||q.marks!==s.marks||cat(q.cognitiveLevel)!==s.category||!langOK(q.questionText,q.questionTextEn,lang)||!langOK(q.answer,q.answerEn,lang))return false;
 if(s.mapAlternative){if(!validMap(q,lang))return false;}else if(q.mapChoices)return false;
 if(s.creativeTask&&!['dialogue','letter','report','plan','article','speech','poster'].includes(q.responseFormat))return false;
 return true;
}
function key(q,lang){return norm(lang==='en'?q.questionTextEn:q.questionText);}
const signature=qs=>qs.map(q=>str(q.id)).sort().join('|');
export function assertSocial2078ReferencePaper(paper,{allowOriginalReferenceDraft=false}={}){
 const r=getSocial2078Reference({grade:paper?.gradeNumber,subject:paper?.subject});
 require(r&&paper.fullMarks===75&&paper.durationMinutes===180&&['ne','en','both'].includes(paper.language)&&Array.isArray(paper.topicIds)&&paper.topicIds.length&&Array.isArray(paper.questions)&&paper.questions.length===24,'scope, marks, time or question count');
 const topics=new Set(paper.topicIds),ids=new Set(),texts=new Set();
 for(const [i,s] of r.slots.entries()){
  const q=paper.questions[i];
  require(eligible(q,s,paper.subject,paper.language,topics,allowOriginalReferenceDraft&&paper.referenceOnly===true),'slot '+(i+1)+' unit, category, question, review or map alternative');
  require(!ids.has(str(q.id))&&!texts.has(key(q,paper.language)),'duplicate question');ids.add(str(q.id));texts.add(key(q,paper.language));
 }
 require([...topics].every(t=>paper.questions.some(q=>q.topicId===t)),'topic coverage');
 return {referenceStructureMatched:true,currentCdcExactApproved:false,teacherReviewRequired:true,fullMarks:75,questionCount:24,cognitiveMarks:r.cognitiveMarks,unitMarks:r.unitMarks};
}
function shuffled(pool,rng){const a=[...pool];for(let i=a.length-1;i>0;i--){const v=rng();if(!Number.isFinite(v)||v<0||v>=1)throw Error('Invalid random source');const j=Math.floor(v*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function planSocial2078ReferencePaper({grade,subject,fullMarks=75,durationMinutes=180,language='both',questions=[],selectedTopicIds=[],previousSignature='',avoidSignatures=[],rng=Math.random,maxVisits=100000,allowOriginalReferenceDraft=false}={}){
 const r=getSocial2078Reference({grade,subject});require(r&&fullMarks===75&&durationMinutes===180&&['ne','en','both'].includes(language),'Grade 9 social 75-mark reference required');
 require(Array.isArray(questions)&&questions.length<=5000&&Array.isArray(selectedTopicIds)&&Array.isArray(avoidSignatures)&&avoidSignatures.length<=30&&avoidSignatures.every(x=>typeof x==='string')&&Number.isSafeInteger(maxVisits)&&maxVisits>0&&maxVisits<=200000,'bank or search options');
 const topics=new Set(selectedTopicIds),cells=r.slots.map((s,i)=>({i,s,pool:questions.filter(q=>eligible(q,s,subject,language,topics,allowOriginalReferenceDraft))}));
 const shortages=cells.filter(c=>!c.pool.length).map(c=>({number:c.i+1,...c.s}));
 const no=reason=>({ready:false,reason,shortages,currentCdcExactApproved:false,readyForLive:false});
 if(shortages.length||!topics.size||topics.size>24)return no('Missing reviewed tasks or incompatible selected topics');
 const order=shuffled(cells,rng).sort((a,b)=>a.pool.length-b.pool.length),chosen=Array(24),ids=new Set(),texts=new Set(),banned=new Set([previousSignature,...avoidSignatures].filter(Boolean));
 let visits=0;
 function dfs(step){
  if(++visits>maxVisits)throw Error('Social reference search exceeded safe limit');
  if(step===order.length)return [...topics].every(t=>chosen.some(q=>q.topicId===t))&&!banned.has(signature(chosen));
  const {i,pool}=order[step];
  for(const q of shuffled(pool,rng)){const id=str(q.id),text=key(q,language);if(ids.has(id)||texts.has(text))continue;ids.add(id);texts.add(text);chosen[i]=q;if(dfs(step+1))return true;chosen[i]=undefined;ids.delete(id);texts.delete(text);}
  return false;
 }
 if(!dfs(0))return no('No distinct complete paper matches all reference slots and selected topics');
 const paper={gradeNumber:9,subject,fullMarks,durationMinutes,language,topicIds:[...topics],referenceOnly:true,questions:structuredClone(chosen)};
 return {ready:true,paper,signature:signature(chosen),...assertSocial2078ReferencePaper(paper,{allowOriginalReferenceDraft}),referenceOnly:true,readyForLive:false,sourceUrl:r.sourceUrl};
}
