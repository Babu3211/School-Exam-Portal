/** Review-only connection to shipped reference question banks.
 * Does not certify the current CDC Grid, set generatedPaper, save or print.
 */
import {cdcSubjectKey} from './cdc-grid-source-index.mjs';
import {planGrade9MathReference} from './cdc-grade9-compulsory-math-grouped.mjs';
import {planSocial2078ReferencePaper} from './cdc-grade9-social-reference-planner.mjs';
import {planGrade9EnglishReferencePaper} from './cdc-grade9-english-grouped-planner.mjs';
import {planEnvironmentSchoolReference} from './cdc-grade9-environment-reference-bank.mjs';
import {planScienceSchoolReference} from './cdc-grade9-science-school-reference.mjs';
const planners={science:planScienceSchoolReference,optional_environment:planEnvironmentSchoolReference,math:planGrade9MathReference,social:planSocial2078ReferencePaper,english:planGrade9EnglishReferencePaper};
const draft=q=>q?.gradeNumber===9&&q.bundled===true&&q.reviewStatus==='draft'&&q.teacherReviewRequired===true&&q.officialCdcQuestion===false&&q.sourceStatus==='SMSS_original_reference_draft'&&q.status!=='archived';
export function referencePreviewTopics({grade,subject,questions=[]}={}){
 if(grade!==9||!Object.hasOwn(planners,cdcSubjectKey(subject)))return [];
 return [...new Set(questions.filter(q=>draft(q)&&q.subject===subject&&typeof q.topicId==='string'&&q.topicId.trim()).map(q=>q.topicId))];
}
export function buildGrade9ReferencePreview({grade,subject,fullMarks,durationMinutes,language,questions=[],selectedTopicIds=[],previousSignature='',rng=Math.random}={}){
 const key=cdcSubjectKey(subject);
 if(grade!==9||!Object.hasOwn(planners,key))throw Error('No review-only reference generator for this grade and subject');
 const requiredDuration=key==='optional_environment'?135:180;
 if(fullMarks!==75||durationMinutes!==requiredDuration)throw Error('This reference requires 75 marks and '+requiredDuration+' minutes');
 if(!['ne','en','both'].includes(language))throw Error('Select a language');
 if(key==='english'&&language!=='en')throw Error('English assessment must be in English');
 if(!Array.isArray(questions)||questions.length>5000||!Array.isArray(selectedTopicIds)||!selectedTopicIds.length||new Set(selectedTopicIds).size!==selectedTopicIds.length)throw Error('Select distinct reference topics');
 const bank=questions.filter(q=>draft(q)&&q.subject===subject);
 const known=new Set(referencePreviewTopics({grade,subject,questions:bank}));
 if(selectedTopicIds.some(id=>!known.has(id)))throw Error('A selected topic has no reference group; select available reference topics');
 const result=planners[key]({grade,subject,fullMarks,durationMinutes,language,questions:bank,selectedTopicIds,previousSignature,rng,allowOriginalReferenceDraft:true});
 if(!result.ready)return {ready:false,reason:result.reason,missing:result.shortages||result.shortage||[],referenceOnly:true,currentCdcExactApproved:false,readyForLive:false};
 if(result.currentCdcExactApproved!==false||result.paper.referenceOnly!==true||result.readyForLive!==false)throw Error('Unexpected reference preview state');
 const p=result.paper,groups=p.groups||p.questions;
 if(!Array.isArray(groups))throw Error('Missing reference groups');
 const choose=(ne,en)=>key==='english'||language==='en'?String(en||ne||''):language==='ne'?String(ne||en||''):[ne,en].filter(Boolean).join(' / ');
 const lines=['REFERENCE DRAFT — NOT FOR EXAM / सन्दर्भ समीक्षा मात्र','Grade 9 · '+subject+' · '+p.fullMarks+' marks · '+p.durationMinutes+' minutes','Current CDC Grid approval and teacher review pending.',result.referenceLabel||'',''];
 for(const [i,g] of groups.entries()){
  const parts=g.subquestions||g.items||[];
  const marks=g.marks??parts.reduce((s,x)=>s+Number(x.marks||0),0);
  lines.push((i+1)+'. '+(key==='english'?g.text:choose(g.contextNe||g.questionText,g.contextEn||g.questionTextEn))+' ['+marks+']');
  if(g.passage)lines.push(g.passage);
  if(g.questionType==='mcq')for(const [j,o] of (g.options||[]).entries())lines.push('  '+String.fromCharCode(65+j)+'. '+choose(o,g.optionsEn?.[j]));
  if(Array.isArray(g.mapChoices)){
   for(const [j,c] of g.mapChoices.entries())lines.push((j===0?'Option A: ':'OR / अथवा B: ')+choose(c.textNe,c.textEn)+' [7]');
  }
  for(const [j,x] of parts.entries()){
   lines.push('  '+String.fromCharCode(97+j)+') '+(key==='english'?x.text:choose(x.textNe,x.textEn))+' ['+x.marks+']');
   if(Array.isArray(x.options))lines.push('    '+x.options.map((o,k)=>String.fromCharCode(65+k)+'. '+o).join('    '));
  }
  lines.push('');
 }
 return {ready:true,referenceOnly:true,currentCdcExactApproved:false,readyForLive:false,signature:result.signature,groupCount:groups.length,text:lines.join('\n'),sourceUrl:result.sourceUrl};
}
